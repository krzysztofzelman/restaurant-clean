import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/apiClient';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  getUserIdFromToken,
  getTokenPayload,
} from '../lib/tokenStorage';
import type { Profile } from '../lib/database.types';

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    try {
      const raw = await apiRequest<Record<string, unknown>>('/api/auth/me');
      const p: Profile = {
        id: raw.id as string,
        email: (raw.email as string) ?? null,
        full_name: (raw.full_name as string) ?? null,
        role: raw.role as Profile['role'],
        is_active: raw.is_active as boolean,
        created_at: raw.created_at as string,
      };
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const data = await apiRequest<Record<string, unknown>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const accessToken = data.access_token as string;
    const refreshToken = data.refresh_token as string;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    setTokens(accessToken, refreshToken || '');

    const payload = getTokenPayload(accessToken);
    const userId = payload?.sub || getUserIdFromToken();
    const userEmail = (payload?.email as string) ?? email;

    const authUser: AuthUser = {
      id: userId as string,
      email: userEmail,
    };
    setUser(authUser);

    // Load profile in the background
    loadProfile(authUser.id).catch(() => {});

    return data;
  }

  async function signUp(email: string, password: string, fullName: string) {
    const data = await apiRequest<Record<string, unknown>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    return data;
  }

  async function signOut() {
    clearTokens();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }

  useEffect(() => {
    // Check for existing valid session
    const token = getAccessToken();
    if (token) {
      const payload = getTokenPayload(token);
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        const userId = payload.sub;
        const authUser: AuthUser = {
          id: userId as string,
          email: (payload.email as string) ?? null,
        };
        setUser(authUser);
        loadProfile(authUser.id);
        return;
      } else {
        // Token expired, try to refresh
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          apiRequest<Record<string, unknown>>('/api/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
            .then((data) => {
              const newAccess = data.access_token as string;
              const newRefresh = (data.refresh_token as string) || refreshToken;
              setTokens(newAccess, newRefresh);

              const payload = getTokenPayload(newAccess);
              const userId = payload?.sub;
              const authUser: AuthUser = {
                id: userId as string,
                email: (payload?.email as string) ?? null,
              };
              setUser(authUser);
              return loadProfile(authUser.id);
            })
            .catch(() => {
              // Refresh failed — clear everything
              clearTokens();
              setUser(null);
              setProfile(null);
              setLoading(false);
            });
        } else {
          clearTokens();
          setLoading(false);
        }
      }
    } else {
      setLoading(false);
    }
  }, []);

  const refreshProfile = async () => {
    if (user) {
      try {
        const raw = await apiRequest<Record<string, unknown>>('/api/auth/me');
        const p: Profile = {
          id: raw.id as string,
          email: (raw.email as string) ?? null,
          full_name: (raw.full_name as string) ?? null,
          role: raw.role as Profile['role'],
          is_active: raw.is_active as boolean,
          created_at: raw.created_at as string,
        };
        setProfile(p);
      } catch {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
