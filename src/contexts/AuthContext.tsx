import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

// Простой утилиты для безопасного хранения данных
const secureStorage = {
  // Ключ для шифрования и дешифрования (простая реализация)
  getEncryptionKey: () => {
    // Домен сайта как соль при шифровании (не идеально, но лучше чем без соли)
    return window.location.hostname || 'domgors';
  },
  
  // Простое шифрование для базовой защиты
  encrypt: (data: string): string => {
    try {
      const key = secureStorage.getEncryptionKey();
      // Используем XOR для простого шифрования
      return btoa(Array.from(data).map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      ).join(''));
    } catch (e) {
      console.error('Encryption error:', e);
      return '';
    }
  },
  
  // Дешифрование
  decrypt: (encryptedData: string): string => {
    try {
      const key = secureStorage.getEncryptionKey();
      // Расшифровываем данные
      return atob(encryptedData).split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
      ).join('');
    } catch (e) {
      console.error('Decryption error:', e);
      return '';
    }
  },
  
  // Сохранение с шифрованием
  setItem: (key: string, value: any): void => {
    try {
      const encryptedValue = secureStorage.encrypt(JSON.stringify(value));
      localStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error('Error saving secure data:', e);
    }
  },
  
  // Получение с дешифрованием
  getItem: (key: string): any => {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      
      const decryptedValue = secureStorage.decrypt(encryptedValue);
      return JSON.parse(decryptedValue);
    } catch (e) {
      console.error('Error reading secure data:', e);
      // При ошибке удаляем проблемные данные
      localStorage.removeItem(key);
      return null;
    }
  },
  
  // Удаление
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  }
};

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
    // Используем secureStorage для получения сохраненных данных пользователя
    return secureStorage.getItem('user')
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
            // Сохраняем данные пользователя в безопасном хранилище
            secureStorage.setItem('user', userData)
            
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
          emailRedirectTo: "https://domgors.onrender.com",
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
      
      if (error) throw error
      
      // Only set the user if email is verified
      if (data.user && data.user.email_confirmed_at) {
        setUser({
          id: data.user.id,
          email: data.user.email!
        })
      } else if (data.user && !data.user.email_confirmed_at) {
        throw new Error('Пожалуйста, подтвердите ваш email перед входом в систему')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
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
