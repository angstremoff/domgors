import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface FavoritesContextType {
  favorites: string[]
  toggleFavorite: (propertyId: string) => Promise<void>
  isFavorite: (propertyId: string) => boolean
  isLoading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Загрузка избранного из localStorage
  const loadLocalFavorites = () => {
    const saved = localStorage.getItem('favorites')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const validFavorites = parsed.filter((id: any) =>
          typeof id === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
        )
        setFavorites(validFavorites)
      } catch (error) {
        console.error('Error parsing local favorites:', error)
        setFavorites([])
      }
    }
    setIsLoading(false)
  }

  // Загрузка избранного из Supabase
  const loadSupabaseFavorites = async () => {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.user) {
      setIsAuthenticated(false)
      loadLocalFavorites()
      return
    }

    setIsAuthenticated(true)
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', session.session.user.id)

    if (error) {
      console.error('Error loading favorites from Supabase:', error)
      return
    }

    setFavorites(data.map(f => f.property_id))
    setIsLoading(false)
  }

  // Инициализация и подписка на изменения авторизации
  useEffect(() => {
    loadSupabaseFavorites()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadSupabaseFavorites()
      } else if (event === 'SIGNED_OUT') {
        loadLocalFavorites()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const toggleFavorite = async (propertyId: string) => {
    const { data: session } = await supabase.auth.getSession()

    if (!session.session?.user) {
      // Неавторизованный пользователь - используем localStorage
      const newFavorites = favorites.includes(propertyId)
        ? favorites.filter(id => id !== propertyId)
        : [...favorites, propertyId]
      
      setFavorites(newFavorites)
      localStorage.setItem('favorites', JSON.stringify(newFavorites))
      return
    }

    // Авторизованный пользователь - используем Supabase
    try {
      if (favorites.includes(propertyId)) {
        // Удаляем из избранного
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .match({
            user_id: session.session.user.id,
            property_id: propertyId
          })

        if (deleteError) throw deleteError
        
        setFavorites(prev => prev.filter(id => id !== propertyId))
      } else {
        // Проверяем существование записи перед добавлением
        const { data: existing, error: checkError } = await supabase
          .from('favorites')
          .select()
          .match({
            user_id: session.session.user.id,
            property_id: propertyId
          })
          .maybeSingle()

        if (checkError) throw checkError

        if (!existing) {
          const { error: insertError } = await supabase
            .from('favorites')
            .insert({
              user_id: session.session.user.id,
              property_id: propertyId
            })

          if (insertError) {
            // If we get a conflict error, the record might have been created concurrently
            if (insertError.code === '23505') {
              console.log('Favorite already exists, skipping insert')
            } else {
              throw insertError
            }
          }
        }
        
        // Only update state if the property isn't already in favorites
        if (!favorites.includes(propertyId)) {
          setFavorites(prev => [...prev, propertyId])
        }
      }
    } catch (error) {
      console.error('Error managing favorites:', error)
      throw error
    }
  }

  const isFavorite = (propertyId: string) => favorites.includes(propertyId)

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, isLoading }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
