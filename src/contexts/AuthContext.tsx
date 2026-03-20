import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Logger } from '../utils/logger';

type LoginResult = {
  error: AuthError | null;
};

type RegisterResult = {
  error: AuthError | null;
  user: User | null;
  session: Session | null;
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserProfile = React.useCallback(async (authUser: User | null) => {
    if (!authUser) {
      return;
    }

    const { error } = await supabase.from('users').upsert(
      {
        id: authUser.id,
        email: authUser.email || '',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      Logger.debug('Профиль пользователя будет создан позже:', error);
    }
  }, []);

  useEffect(() => {
    // Проверка активной сессии при загрузке
    const setAuthData = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        await ensureUserProfile(data.session?.user ?? null);
      } catch (error) {
        Logger.error('Ошибка при получении сессии:', error);
        // Очищаем данные сессии при ошибке
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    setAuthData();

    // Подписка на изменения состояния аутентификации
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'domgomobile://auth/callback?source=mobile',
        data: {
          source: 'mobile_app',
          platform: Platform.OS,
        },
      },
    });

    if (data.session?.user) {
      await ensureUserProfile(data.session.user);
    }

    return { error, user: data.user, session: data.session };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout }}>
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
