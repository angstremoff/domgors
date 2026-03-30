import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { buildWebAuthCallbackUrl, buildWebResetPasswordUrl } from '../utils/authSessionUrl';
import { ensureUserContactProfile, type ContactProfileClient } from '../utils/contactProfile';

type LoginResult = {
  error: AuthError | null;
};

type RegisterResult = {
  error: AuthError | null;
  user: User | null;
  session: Session | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string) => Promise<RegisterResult>;
  requestPasswordReset: (email: string) => Promise<LoginResult>;
  updatePassword: (password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const contactSupabase = supabase as unknown as ContactProfileClient;

  const ensureUserProfile = React.useCallback(async (authUser: User | null) => {
    if (!authUser) {
      return;
    }

    try {
      await ensureUserContactProfile(contactSupabase, authUser);
    } catch (error) {
      Logger.debug('Профиль пользователя будет создан позже:', error);
    }
  }, [contactSupabase]);

  useEffect(() => {
    const setAuthData = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        await ensureUserProfile(data.session?.user ?? null);
      } catch (error) {
        Logger.error('Ошибка при получении сессии:', error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    setAuthData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      Logger.debug('Изменилось состояние авторизации:', event);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      void ensureUserProfile(nextSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [ensureUserProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    return { error };
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: buildWebAuthCallbackUrl(),
        data: {
          source: 'mobile_app',
          platform: 'mobile',
        },
      },
    });

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

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, requestPasswordReset, updatePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
