import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

// Интерфейс для типа города
export interface City {
  id: number;
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface CityContextType {
  cities: City[];
  selectedCity: City | null;
  selectCity: (city: City | null) => void;
  loadCities: () => Promise<void>;
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  openCityModal: () => void; // Добавляем новый метод для удобного открытия модального окна
}

const CityContext = createContext<CityContextType | undefined>(undefined);

// Ключи для хранения в localStorage
const SELECTED_CITY_KEY = 'domgo_selected_city';
const CITIES_CACHE_KEY = 'domgo_cities_cache';
// Время жизни кэша - 24 часа
const CITIES_CACHE_TTL = 24 * 60 * 60 * 1000;

export const CityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Загрузка городов с поддержкой кэширования
  const loadCities = async () => {
    try {
      setIsLoading(true);

      // Проверяем кэш
      const cachedData = localStorage.getItem(CITIES_CACHE_KEY);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = new Date().getTime();
          
          // Если кэш актуален, используем его
          if (now - timestamp < CITIES_CACHE_TTL) {
            console.log('Загружаем города из кэша');
            setCities(data);
            setIsLoading(false);
            return data;
          }
        } catch (e) {
          console.error('Ошибка при чтении кэша городов:', e);
          // При ошибке чтения кэша удаляем его
          localStorage.removeItem(CITIES_CACHE_KEY);
        }
      }

      console.log('Загружаем города из API');
      // Если кэша нет или он устарел, делаем запрос
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Ошибка при загрузке городов:', error);
        return [];
      }

      // Преобразование данных в нужный формат
      const citiesWithCoordinates = data.map((city: any) => ({
        id: city.id,
        name: city.name,
        coordinates: city.coordinates
          ? { 
              lat: city.coordinates.lat || 0, 
              lng: city.coordinates.lng || 0 
            }
          : undefined
      }));

      // Сохраняем в кэш
      try {
        localStorage.setItem(CITIES_CACHE_KEY, JSON.stringify({
          data: citiesWithCoordinates,
          timestamp: new Date().getTime()
        }));
      } catch (e) {
        console.error('Ошибка при сохранении кэша городов:', e);
      }

      setCities(citiesWithCoordinates);
      return citiesWithCoordinates;
    } catch (error) {
      console.error('Ошибка при загрузке городов:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const selectCity = (city: City | null) => {
    setSelectedCity(city)
    // Сохраняем выбранный город в localStorage
    if (city) {
      localStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city))
    } else {
      localStorage.removeItem(SELECTED_CITY_KEY)
    }
    setIsModalOpen(false)
  }

  // Восстанавливаем выбранный город из localStorage после загрузки городов
  const restoreSelectedCity = (citiesData: City[]) => {
    const savedCity = localStorage.getItem(SELECTED_CITY_KEY)
    if (savedCity) {
      try {
        const parsed = JSON.parse(savedCity)
        // Находим город в списке загруженных городов по ID
        const cityFromList = citiesData.find(city => city.id === parsed.id)
        if (cityFromList) {
          setSelectedCity(cityFromList)
        }
      } catch (e) {
        console.error('Ошибка при чтении сохранённого города:', e)
        localStorage.removeItem(SELECTED_CITY_KEY)
      }
    }
  }

  // Загружаем города при монтировании компонента
  useEffect(() => {
    const initializeCities = async () => {
      // Загружаем города и восстанавливаем выбранный город
      const citiesData = await loadCities();
      if (citiesData && citiesData.length > 0) {
        restoreSelectedCity(citiesData);
      }
    };

    initializeCities();
  }, []);

  // Добавляем прямой метод для открытия модального окна
  const openCityModal = () => {
    setIsModalOpen(true);
  };

  // Экспортируем контекст в глобальное пространство для доступа из консоли и отладки
  // @ts-ignore - Игнорируем предупреждение TypeScript о window
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.cityContext = {
      setIsModalOpen, 
      openCityModal,
      selectedCity
    };
  }

  return (
    <CityContext.Provider
      value={{
        cities,
        selectedCity,
        selectCity,
        loadCities,
        isLoading,
        isModalOpen,
        setIsModalOpen,
        openCityModal
      }}
    >
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
