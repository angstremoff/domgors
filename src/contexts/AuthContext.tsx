import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string) => Promise<{user: User | null, needsEmailVerification: boolean}>
  signInWithGoogle: () => Promise<void>
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
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Only set the user if email is verified
        if (session.user.email_confirmed_at) {
          const userData = {
            id: session.user.id,
            email: session.user.email!
          }
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        }
      } else {
        setUser(null)
        localStorage.removeItem('user')
      }
    })

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

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
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
          data: {
            email: email
          }
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
    localStorage.removeItem('user')

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
    <AuthContext.Provider value={{ user, login, logout, register, signInWithGoogle, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthProvider, useAuth }
