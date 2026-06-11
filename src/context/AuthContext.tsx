import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  startTransition,
  type ReactNode,
} from 'react';
import { apiRequest } from '../lib/apiClient';
import {
  setAccessToken,
  clearAccessToken,
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

  async function loadProfile() {
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
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        );
        if (!res.ok) {
          clearAccessToken();
          if (!cancelled) startTransition(() => setLoading(false));
          return;
        }
        const data = (await res.json()) as { access_token: string };
        setAccessToken(data.access_token);

        const payload = getTokenPayload();
        const userId = payload?.sub;
        if (userId && !cancelled) {
          const authUser: AuthUser = {
            id: userId as string,
            email: (payload?.email as string) ?? null,
          };
          startTransition(() => setUser(authUser));
          await loadProfile();
        }
      } catch {
        clearAccessToken();
      } finally {
        if (!cancelled) startTransition(() => setLoading(false));
      }
    }

    initSession();
    return () => { cancelled = true; };
  }, []);

  async function signIn(email: string, password: string) {
    const data = await apiRequest<Record<string, unknown>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const accessToken = data.access_token as string;
    if (!accessToken) {
      throw new Error('No access token received');
    }

    setAccessToken(accessToken);

    const payload = getTokenPayload();
    const userId = payload?.sub;
    const userEmail = (payload?.email as string) ?? email;

    const authUser: AuthUser = {
      id: userId as string,
      email: userEmail,
    };
    setUser(authUser);
    await loadProfile();

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
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/logout`,
        { method: 'POST', credentials: 'include' },
      );
    } catch {
      // ignore network errors on logout
    }
    clearAccessToken();
    setUser(null);
    setProfile(null);
    setLoading(false);
  }

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        await loadProfile();
      } catch {
        // ignore
      }
    }
  }, [user]);

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
