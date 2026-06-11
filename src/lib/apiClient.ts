import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStorage';

const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const REFRESH_PATH = '/api/auth/refresh';

export class ApiClientError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiClientError';
    this.status = status;
    this.detail = detail;
  }
}

// Refresh-token state machine — ensures only one refresh at a time
let _refreshing: Promise<boolean> | null = null;
let _refreshSubscribers: Array<(ok: boolean) => void> = [];

async function _doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}${REFRESH_PATH}`, {
      method: 'POST',
      credentials: 'include', // send httpOnly cookie
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      // Refresh failed — clear everything
      clearAccessToken();
      return false;
    }
    const data = (await res.json()) as { access_token: string };
    setAccessToken(data.access_token);
    return true;
  } catch {
    clearAccessToken();
    return false;
  }
}

async function _refreshToken(): Promise<boolean> {
  // If already refreshing, wait for result
  if (_refreshing) {
    return new Promise((resolve) => {
      _refreshSubscribers.push(resolve);
    });
  }

  _refreshing = _doRefresh().finally(() => {
    // Notify all subscribers
    const subs = _refreshSubscribers;
    _refreshSubscribers = [];
    _refreshing = null;
    // Notify after freeing _refreshing so subscribers see null
    subs.forEach((fn) => fn(_refreshing === null)); // refreshing was set to null
  });

  return _refreshing;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // send cookies (for CSRF-safe endpoints)
  });

  // 401 → try refreshing token, then retry once
  if (response.status === 401 && path !== REFRESH_PATH) {
    const refreshed = await _refreshToken();
    if (refreshed) {
      // Retry with new token
      const newToken = getAccessToken();
      const retryHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };
      if (newToken) {
        retryHeaders['Authorization'] = `Bearer ${newToken}`;
      }
      if (!(options.body instanceof FormData)) {
        retryHeaders['Content-Type'] = 'application/json';
      }
      const retryResponse = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
      if (retryResponse.status === 204) {
        return undefined as T;
      }
      const retryData = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new ApiClientError(
          retryResponse.status,
          retryData.detail || `Request failed with status ${retryResponse.status}`,
        );
      }
      return retryData as T;
    }
    // Refresh failed — propagate 401
    throw new ApiClientError(401, 'Session expired');
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      data.detail || `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}
