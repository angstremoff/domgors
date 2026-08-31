'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { buildWebAuthCallbackUrl, buildWebResetPasswordUrl } from '@shared/utils/authSessionUrl';
import { ensureUserContactProfile, type ContactProfileClient } from '@shared/utils/contactProfile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null; session: Session | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const contactSupabase = supabase as unknown as ContactProfileClient;

  const ensureUserProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      return;
    }

    try {
      await ensureUserContactProfile(contactSupabase, authUser);
    } catch {
      return;
    }
  }, [contactSupabase]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      await ensureUserProfile(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void ensureUserProfile(nextSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [ensureUserProfile, supabase.auth]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const emailRedirectTo = buildWebAuthCallbackUrl();

    // Клиентский таймаут: при зависании сервера (например, синхронная отправка
    // письма подтверждения виснет и шлюз отдаёт 504) не мучаем пользователя
    // минутным спиннером — через 25с отдаём понятную ошибку сети,
    // которую getAuthErrorMessage показывает как «сервис временно недоступен».
    const SIGNUP_TIMEOUT_MS = 25_000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Request timeout')),
        SIGNUP_TIMEOUT_MS
      );
    });

    let data: { user: User | null; session: Session | null };
    let error: AuthError | null;
    try {
      const result = await Promise.race([
        supabase.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: {
            emailRedirectTo,
            data: {
              source: 'web_app',
              platform: 'web',
            },
          },
        }),
        timeoutPromise,
      ]);
      data = result.data;
      error = result.error;
    } catch (timeoutOrNetworkError) {
      // Таймаут гонки или сетевой сбой: приводим к AuthError-подобной форме
      error = {
        name: 'AuthError',
        message:
          timeoutOrNetworkError instanceof Error
            ? timeoutOrNetworkError.message
            : 'Network request failed',
      } as AuthError;
      data = { user: null, session: null };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (data.session?.user) {
      await ensureUserProfile(data.session.user);
    }

    return { error, user: data.user, session: data.session };
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: buildWebResetPasswordUrl(),
    });

    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        requestPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
