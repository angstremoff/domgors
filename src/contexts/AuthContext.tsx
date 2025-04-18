import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { secureStorage } from '../services/encryptionService'
import { setUserContext, clearUserContext, captureError } from '../services/sentryService'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string) => Promise<{user: User | null, needsEmailVerification: boolean}>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Попытка восстановить сессию из зашифрованного хранилища
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        // Работаем с промисами нового шифрования
        secureStorage.getItem('user')
          .then(userData => {
            if (userData) setUser(userData);
          })
          .catch(error => {
            console.error('Ошибка при чтении данных пользователя:', error);
            localStorage.removeItem('user');
          });
      } catch (e) {
        console.error('Ошибка при десериализации данных пользователя:', e);
        localStorage.removeItem('user');
      }
    }
    return null;
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (session?.user) {
          // Only set the user if email is verified
          if (session.user.email_confirmed_at) {
            const userData = {
              id: session.user.id,
              email: session.user.email!
            }
            setUser(userData)
            
            // Устанавливаем контекст пользователя для Sentry
            setUserContext(session.user.id);
            
            // Сохраняем данные пользователя в безопасном хранилище
            secureStorage.setItem('user', userData)
              .catch(error => {
                console.error('Ошибка при сохранении данных пользователя:', error);
                captureError(error);
              })
            
            // Получаем метаданные пользователя
            const metadata = session.user.user_metadata;
            
            // Сохраняем данные пользователя в таблицу users после подтверждения email
            const saveUserProfile = async () => {
              // Сначала проверяем, есть ли уже запись для этого пользователя
              const { data: existingProfile, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 - код ошибки "не найдено"
                console.error('Error fetching user profile:', fetchError);
                return;
              }
              
              // Если профиль уже существует, не обновляем его данными из метаданных
              if (existingProfile) {
                console.log('User profile already exists, not overwriting');
                return;
              }
              
              // Создаем новый профиль только если его еще нет
              const { error: profileError } = await supabase
                .from('users')
                .insert({ 
                  id: session.user.id, 
                  email: session.user.email!,
                  name: metadata?.name || '',
                  phone: metadata?.phone || ''
                });
                
              if (profileError) {
                console.error('Error creating user profile after verification:', profileError);
              }
            }
            
            saveUserProfile();
          }
        } else {
          setUser(null)
          // Удаляем контекст пользователя из Sentry
          clearUserContext();
          // Удаляем данные из безопасного хранилища
          secureStorage.removeItem('user')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && session.user.email_confirmed_at) {
        setUser({
          id: session.user.id,
          email: session.user.email!
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    try {
      // Регистрация пользователя в системе аутентификации
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin, // Используем текущий домен для редиректа
        }
      })

      if (error) throw error

      // Return user data and verification status without setting the user state
      if (data.user) {
        const userData = {
          id: data.user.id,
          email: data.user.email!
        }
        
        // Check if email confirmation is needed
        const needsEmailVerification = !data.user.email_confirmed_at
        
        // Don't set the user or store in localStorage until email is verified
        return { user: userData, needsEmailVerification }
      }
      
      return { user: null, needsEmailVerification: false }
    } catch (error: any) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        captureError(error, { context: 'login', email });
        throw error;
      }
      
      // Only set the user if email is verified
      if (data.user && data.user.email_confirmed_at) {
        setUser({
          id: data.user.id,
          email: data.user.email!
        })
      } else if (data.user && !data.user.email_confirmed_at) {
        throw new Error('Пожалуйста, подтвердите ваш email перед входом в систему')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      // Логируем ошибку в Sentry, но без персональных данных
      captureError(error, { context: 'login_attempt' });
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
    // Удаляем контекст пользователя из Sentry
    clearUserContext();
    // Удаляем данные из безопасного хранилища
    secureStorage.removeItem('user')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthProvider, useAuth }
