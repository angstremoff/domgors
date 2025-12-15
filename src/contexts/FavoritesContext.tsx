import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Logger } from '../utils/logger';

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Set для O(1) проверки isFavorite вместо O(N) поиска в массиве
  const favoritesSetRef = useRef<Set<string>>(new Set());

  // Обновляем Set при изменении favorites
  useEffect(() => {
    favoritesSetRef.current = new Set(favorites);
  }, [favorites]);

  // Загрузка избранного из AsyncStorage
  const loadLocalFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        const validFavorites = parsed.filter((id: any) =>
          typeof id === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
        );
        setFavorites(validFavorites);
      }
    } catch (error) {
      Logger.error('Ошибка разбора локального избранного:', error);
      setFavorites([]);
    }
    setIsLoading(false);
  };

  // Загрузка избранного из Supabase
  const loadSupabaseFavorites = async () => {
    if (!user) {
      loadLocalFavorites();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('property_id')
        .eq('user_id', user.id);

      if (error) {
        Logger.error('Error loading favorites from Supabase:', error);
        return;
      }

      if (data) {
        setFavorites(data.map(f => f.property_id));
      }
    } catch (error) {
      Logger.error('Error loading Supabase favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Инициализация при запуске и обновление при изменении состояния авторизации
  useEffect(() => {
    if (user) {
      loadSupabaseFavorites();
    } else {
      loadLocalFavorites();
    }
  }, [user]);

  // Стабильная ссылка на toggleFavorite с useCallback для предотвращения лишних ререндеров карточек
  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (!user) {
      // Неавторизованный пользователь - используем AsyncStorage
      setFavorites(prev => {
        const isCurrentlyFavorite = prev.includes(propertyId);
        const newFavorites = isCurrentlyFavorite
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId];

        // Асинхронно сохраняем в AsyncStorage
        AsyncStorage.setItem('favorites', JSON.stringify(newFavorites)).catch(err =>
          Logger.error('Error saving favorites to AsyncStorage:', err)
        );

        return newFavorites;
      });
      return;
    }

    // Авторизованный пользователь - используем Supabase
    try {
      const isCurrentlyFavorite = favoritesSetRef.current.has(propertyId);

      if (isCurrentlyFavorite) {
        // Удаляем из избранного
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', propertyId);

        if (deleteError) throw deleteError;
        setFavorites(prev => prev.filter(id => id !== propertyId));
      } else {
        // Добавляем в избранное
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            property_id: propertyId
          });

        if (insertError) throw insertError;
        setFavorites(prev => [...prev, propertyId]);
      }
    } catch (error) {
      Logger.error('Error toggling favorite:', error);
    }
  }, [user]);

  // O(1) проверка вместо O(N) благодаря Set
  const isFavorite = useCallback((propertyId: string) => {
    return favoritesSetRef.current.has(propertyId);
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, isLoading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
