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
const RESEND_MAX_ATTEMPTS = 3;
const DEFAULT_WEB_EMAIL_REDIRECT = 'https://domgo.rs';

const wait = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const stripTrailingSlash = (url: string) => url.endsWith('/') ? url.slice(0, -1) : url;

const getWebEmailRedirectTo = () => {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) {
    return stripTrailingSlash(configuredSiteUrl);
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  return DEFAULT_WEB_EMAIL_REDIRECT;
};

const isRecoverableSignUpError = (error: AuthError | null) => {
  if (!error) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();
  return normalizedMessage.includes('error sending confirmation email')
    || normalizedMessage.includes('failed to send confirmation email')
    || normalizedMessage.includes('user already registered')
    || normalizedMessage.includes('email not confirmed')
    || normalizedMessage.includes('email rate limit')
    || normalizedMessage.includes('smtp');
};

const tryResendSignupConfirmation = async (
  supabase: ReturnType<typeof createClient>,
  email: string,
  emailRedirectTo: string
) => {
  let lastResendError: AuthError | null = null;

  for (let attempt = 1; attempt <= RESEND_MAX_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo,
      },
    });

    lastResendError = error;

    if (!lastResendError) {
      return null;
    }

    if (attempt !== RESEND_MAX_ATTEMPTS) {
      await wait(attempt * 500);
    }
  }

  return lastResendError;
};

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
    const normalizedEmail = normalizeEmail(email);
    const emailRedirectTo = getWebEmailRedirectTo();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
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

    if (error && isRecoverableSignUpError(error)) {
      const resendError = await tryResendSignupConfirmation(supabase, normalizedEmail, emailRedirectTo);
      if (!resendError) {
        return { error: null, user: data.user, session: null };
      }

      return { error: resendError, user: data.user, session: data.session };
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
