'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthError, Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const ensureUserProfile = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      return;
    }

    const { error } = await supabase.from('users')
      // @ts-expect-error - drift between generated DB types and Supabase upsert typing
      .upsert(
      {
        id: authUser.id,
        email: authUser.email || '',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      return;
    }
  }, [supabase]);

  useEffect(() => {
    // Получение текущей сессии
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      await ensureUserProfile(session?.user ?? null);
      setLoading(false);
    });

    // Подписка на изменения auth
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
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const emailRedirectTo = typeof window !== 'undefined'
      ? window.location.origin
      : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          source: 'web_app',
          platform: 'web',
        },
      },
    });

    if (data.session?.user) {
      await ensureUserProfile(data.session.user);
    }

    return { error, user: data.user, session: data.session };
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
