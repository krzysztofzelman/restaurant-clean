/** In-memory access token storage (not persisted to localStorage — XSS-safe). */

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function clearAccessToken(): void {
  _accessToken = null;
}

/** Decode JWT payload without signature verification (client-side only). */
export function getTokenPayload(): Record<string, unknown> | null {
  const token = _accessToken;
  if (!token) return null;
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function getUserIdFromToken(): string | null {
  const payload = getTokenPayload();
  if (!payload || typeof payload.sub !== 'string') return null;
  return payload.sub;
}
