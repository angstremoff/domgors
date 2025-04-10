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
}

const CityContext = createContext<CityContextType | undefined>(undefined);

// Ключ для хранения выбранного города в localStorage
const SELECTED_CITY_KEY = 'domgo_selected_city'

export const CityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadCities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Ошибка при загрузке городов:', error);
        return;
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

      setCities(citiesWithCoordinates);
    } catch (error) {
      console.error('Ошибка при загрузке городов:', error);
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

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('cities')
          .select('*')

        if (error) throw error
        
        const citiesData = data.map(city => ({
          id: city.id,
          name: city.name,
          coordinates: city.coordinates ? {
            lat: city.coordinates.lat,
            lng: city.coordinates.lng
          } : undefined
        }))

        setCities(citiesData)
        
        // Восстанавливаем выбранный город из localStorage
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
            console.error('Error parsing saved city:', e)
            localStorage.removeItem(SELECTED_CITY_KEY)
          }
        }
      } catch (error) {
        console.error('Error fetching cities:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCities()
  }, []);

  return (
    <CityContext.Provider
      value={{
        cities,
        selectedCity,
        selectCity,
        loadCities,
        isLoading,
        isModalOpen,
        setIsModalOpen
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
