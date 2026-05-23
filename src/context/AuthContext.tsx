import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getUserProfile } from '../services/api';
import type { Profile } from '../lib/database.types';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<unknown>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h
const STORAGE_KEY = 'restaurant_session_start';

function getSessionStart(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

function setSessionStart() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // localStorage niedostępny
  }
}

function clearSessionStart() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage niedostępny
  }
}

function isSessionExpired(): boolean {
  const start = getSessionStart();
  if (!start) return false;
  return Date.now() - start > SESSION_TIMEOUT_MS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    try {
      const p = await getUserProfile(userId);
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    clearSessionStart();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  useEffect(() => {
    // Check active session + session timeout
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Sprawdź czy sesja nie wygasła
        if (isSessionExpired()) {
          signOut().catch(() => {});
          setLoading(false);
          return;
        }
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: string, session) => {
        if (session?.user) {
          setSessionStart();
          setUser(session.user);
          loadProfile(session.user.id);
        } else {
          clearSessionStart();
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      },
    );

    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.id);
      setProfile(p);
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
