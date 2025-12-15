import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Logger } from '../utils/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const setFavoritesAndSync = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setFavorites((prev) => {
      const nextFavorites =
        typeof updater === 'function'
          ? (updater as (prev: string[]) => string[])(prev)
          : updater;
      favoritesSetRef.current = new Set(nextFavorites);
      return nextFavorites;
    });
  }, []);

  // Дополнительная синхронизация (на случай внешних обновлений стейта)
  useEffect(() => {
    favoritesSetRef.current = new Set(favorites);
  }, [favorites]);

  // Загрузка избранного из AsyncStorage
  const loadLocalFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favorites');
      const parsed: unknown = saved ? JSON.parse(saved) : null;
      const list = Array.isArray(parsed) ? parsed : [];
      const validFavorites = list.filter((id): id is string => typeof id === 'string' && UUID_REGEX.test(id));
      setFavoritesAndSync(validFavorites);
    } catch (error) {
      Logger.error('Ошибка разбора локального избранного:', error);
      setFavoritesAndSync([]);
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
        Logger.error('Ошибка загрузки избранного из Supabase:', error);
        return;
      }

      if (data) {
        setFavoritesAndSync(data.map((favorite) => favorite.property_id));
      }
    } catch (error) {
      Logger.error('Ошибка загрузки избранного из Supabase:', error);
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
      setFavoritesAndSync((prev) => {
        const isCurrentlyFavorite = prev.includes(propertyId);
        const newFavorites = isCurrentlyFavorite ? prev.filter((id) => id !== propertyId) : [...prev, propertyId];

        // Асинхронно сохраняем в AsyncStorage
        AsyncStorage.setItem('favorites', JSON.stringify(newFavorites)).catch((error) =>
          Logger.error('Ошибка сохранения избранного в AsyncStorage:', error),
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
        setFavoritesAndSync((prev) => prev.filter((id) => id !== propertyId));
      } else {
        // Добавляем в избранное
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            property_id: propertyId
          });

        if (insertError) throw insertError;
        setFavoritesAndSync((prev) => (prev.includes(propertyId) ? prev : [...prev, propertyId]));
      }
    } catch (error) {
      Logger.error('Ошибка изменения избранного:', error);
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
    throw new Error('useFavorites должен использоваться внутри FavoritesProvider');
  }
  return context;
}
