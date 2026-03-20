import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { getCacheTimestamp, propertyService } from '../services/propertyService';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { Logger } from '../utils/logger';

// Тип для свойства
export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  area?: number;
  rooms?: number;
  bathrooms?: number;
  type: 'sale' | 'rent';
  rentType?: 'rent' | 'sale';
  property_type?: 'apartment' | 'house' | 'commercial' | 'land';
  status?: 'active' | 'sold' | 'rented' | null;
  is_new_building?: boolean | null; // Новое поле для новостроек
  features?: string[];
  latitude?: string;
  longitude?: string;
  coordinates?: { lat: number; lng: number } | string; // Координаты из Supabase в формате JSON объекта или строки JSON
  address?: string;
  location?: string;
  city_id?: number | null; // Исправлено: должен соответствовать схеме базы данных
  city?: { name: string };
  district_id?: string | null;
  district?: {
    id: string;
    name: string;
    city_id?: number;
  } | null;
  user_id: string;
  user?: { 
    name: string | null;
    phone: string | null;
    is_agency?: boolean | null;
  };
  contact?: {
    name?: string;
    phone?: string;
  };
  agency_id?: string | null;
  agency?: {
    id: string;
    name: string | null;
    phone: string | null;
    logo_url?: string | null;
    description?: string | null;
    website?: string | null;
    instagram?: string | null;
    facebook?: string | null;
  } | null;
  images?: string[];
  created_at?: string;
}

// Тип для города
export interface City {
  id: number;
  name: string;
  latitude?: string;
  longitude?: string;
  coordinates?: { lat: number; lng: number } | null;
}

export interface District {
  id: string;
  name: string;
  city_id: number;
  is_active?: boolean;
  sort_order?: number;
  latitude?: string | null;
  longitude?: string | null;
}

interface PropertyContextType {
  properties: Property[];
  filteredProperties: Property[];
  loading: boolean;
  selectedCity: City | null;
  setSelectedCity: (city: City | null) => void;
  selectedDistrict: District | null;
  setSelectedDistrict: (district: District | null) => void;
  getPropertiesByType: (type: 'sale' | 'rent' | 'newBuildings', page?: number, pageSize?: number) => Promise<{
    data: Property[];
    totalCount: number;
    hasMore: boolean;
  }>;
  setFilteredProperties: (properties: Property[]) => void;
  refreshProperties: (type?: 'all' | 'sale' | 'rent' | 'newBuildings') => Promise<void>;
  loadMoreProperties: (type?: 'all' | 'sale' | 'rent' | 'newBuildings') => Promise<void>; // Асинхронная подгрузка без debounce
  invalidateCache: () => Promise<void>; // Добавлен новый метод для обновления кэша
  getHasMore: (type?: 'all' | 'sale' | 'rent' | 'newBuildings') => boolean; // Селектор наличия следующей страницы
  totalProperties: number; // total для активного типа
  cities: City[];
  loadCities: () => Promise<City[]>;
  citiesLoading: boolean;
  districts: District[];
  loadDistricts: (cityId?: number | string | null) => Promise<District[]>;
  districtsLoading: boolean;
  fetchPropertyById: (id: string) => Promise<Property | null>; // Добавлен метод для загрузки объявления по ID
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsCityId, setDistrictsCityId] = useState<number | null>(null);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<{
    all: number;
    sale: number;
    rent: number;
    newBuildings: number;
  }>({
    all: 1,
    sale: 1,
    rent: 1,
    newBuildings: 1
  });
  const [hasMore, setHasMore] = useState<{
    all: boolean;
    sale: boolean;
    rent: boolean;
    newBuildings: boolean;
  }>({
    all: true,
    sale: true,
    rent: true,
    newBuildings: true
  });
  const [totalCount, setTotalCount] = useState<{
    all: number;
    sale: number;
    rent: number;
    newBuildings: number;
  }>({
    all: 0,
    sale: 0,
    rent: 0,
    newBuildings: 0
  });
  const pageSize = 10; // Размер страницы для пагинации
  // Пагинация: фиксированный размер страницы. Избегаем рывков скролла за счет аккуратного обновления списков без глобального setLoading при догрузке.

  // Загрузка объявлений при первом рендере
  useEffect(() => {
    // Добавляем проверку, чтобы избежать ненужных запросов
    if (properties.length === 0) {
      fetchProperties();
    }
  }, []);

  // Флаг для отслеживания текущих запросов, чтобы избежать параллельных запросов
  const requestInProgress = React.useRef({
    all: false,
    sale: false,
    rent: false,
    newBuildings: false
  });

  // Кэш последних запросов для предотвращения дублирования
  const lastFetchTime = React.useRef({
    all: 0,
    sale: 0,
    rent: 0,
    newBuildings: 0
  });
  // Следим за глобальной инвалидацией в propertyService
  const cacheVersionRef = React.useRef<number>(getCacheTimestamp());
  
  // Минимальный интервал между запросами (в миллисекундах)
  const MIN_FETCH_INTERVAL = 300000; // 5 минут = 300 секунд = 300000 мс

  const fetchProperties = async () => {
    // Проверяем, идет ли уже запрос или был недавний запрос
    const now = Date.now();
    const globalCacheVersion = getCacheTimestamp();
    const fetchedAfterInvalidation = lastFetchTime.current.all >= globalCacheVersion;
    if (requestInProgress.current.all || 
        ((now - lastFetchTime.current.all < MIN_FETCH_INTERVAL && properties.length > 0) && fetchedAfterInvalidation)) {
      Logger.debug('Запрос уже выполняется или данные были недавно загружены, пропускаем');
      return;
    }
    
    try {
      requestInProgress.current.all = true;
      setLoading(true);
      
      const result = await propertyService.getProperties(1, pageSize);
      
      // Добавляем проверку на существование данных
      if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        setProperties(result.data as Property[]);
        setFilteredProperties(result.data as Property[]);
        setHasMore(prev => ({ ...prev, all: (result as any).hasMore || false }));
        setTotalCount(prev => ({ ...prev, all: (result as any).totalCount || 0, newBuildings: 0 }));
        setCurrentPage(prev => ({ ...prev, all: 1 }));
        lastFetchTime.current.all = Date.now();
        cacheVersionRef.current = getCacheTimestamp();
        
        Logger.debug(`Данные успешно загружены из Supabase: ${result.data.length} из ${(result as any).totalCount || 0}`);
      } else {
        // Если result пустой или неправильного формата
        setProperties([]);
        setFilteredProperties([]);
        setHasMore(prev => ({ ...prev, all: false }));
        setTotalCount(prev => ({ ...prev, all: 0, newBuildings: 0 }));
        Logger.debug('Получен пустой результат из propertyService.getProperties');
      }
    } catch (error) {
      Logger.error('Ошибка при загрузке данных:', error);
    } finally {
      requestInProgress.current.all = false;
      setLoading(false);
    }
  };

  // Обновление списка объявлений (для пользовательского pull-to-refresh)
  // Сохраняем последний активный тип сделки
  const activePropertyTypeRef = React.useRef<'all' | 'sale' | 'rent' | 'newBuildings'>('all');

  // RU: Обновлённая функция refreshProperties с учётом активного типа и безопасным состоянием.
  // EN: Updated refreshProperties respects active type and keeps state safe.
  const refreshProperties = async (type?: 'all' | 'sale' | 'rent' | 'newBuildings') => {
    // Устанавливаем activePropertyTypeRef в переданный type или 'all' при вызове refreshProperties
    activePropertyTypeRef.current = type || 'all';
    
    // Пропускаем обновление, если уже идет запрос
    if (requestInProgress.current.all) {
      Logger.debug('Обновление пропущено: уже выполняется запрос');
      return;
    }
    
    try {
      requestInProgress.current.all = true;
      setLoading(true);

      const activeType = activePropertyTypeRef.current;
      if (activeType === 'all') {
        // Загружаем общий список (all)
        const result = await propertyService.getProperties(1, pageSize);
        if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data) && result.data.length > 0) {
          Logger.debug(`Данные успешно загружены из Supabase: ${result.data.length} из ${(result as any).totalCount || 0}`);
          setProperties(result.data as Property[]);
          setFilteredProperties(result.data as Property[]);
          setHasMore(prev => ({ ...prev, all: (result as any).hasMore || false }));
          setTotalCount(prev => ({ ...prev, all: (result as any).totalCount || 0, newBuildings: 0 }));
          setCurrentPage(prev => ({ ...prev, all: 1 }));
          lastFetchTime.current.all = Date.now();
        } else {
          Logger.debug('Нет данных из Supabase');
          setProperties([]);
          setFilteredProperties([]);
          setHasMore(prev => ({ ...prev, all: false }));
          setTotalCount(prev => ({ ...prev, all: 0, newBuildings: 0 }));
          Alert.alert('Внимание', 'Нет доступных объявлений');
        }
      } else {
        // Загружаем данные конкретного типа (sale/rent/newBuildings), чтобы не терять элементы при "all"-первой странице
        Logger.debug(`Обновляем данные для типа: ${activeType}`);
        const apiType = activeType === 'newBuildings' ? 'sale' : activeType;
        const result = await propertyService.getPropertiesByType(apiType as 'sale' | 'rent', 1, pageSize);
        if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data) && result.data.length > 0) {
          setFilteredProperties(result.data as Property[]);
          // Обновляем состояние пагинации и кэша для активного типа
          setHasMore(prev => ({ ...prev, [activeType]: (result as any).hasMore || false }));
          setTotalCount(prev => ({ ...prev, [activeType]: (result as any).totalCount || 0 }));
          setCurrentPage(prev => ({ ...prev, [activeType]: 1 }));
          if (apiType === 'sale' || apiType === 'rent') {
            lastFetchTime.current[apiType] = Date.now();
          }
          // Синхронизируем кэш типа
          if (apiType === 'sale' || apiType === 'rent') {
            if (!typeCache.current[apiType]) {
              typeCache.current[apiType] = { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 };
            }
            typeCache.current[apiType] = {
              data: result.data as Property[],
              totalCount: (result as any).totalCount || 0,
              hasMore: (result as any).hasMore || false,
              timestamp: Date.now(),
              pageSize
            };
          }
        } else {
          setFilteredProperties([]);
          setHasMore(prev => ({ ...prev, [activeType]: false }));
          setTotalCount(prev => ({ ...prev, [activeType]: 0 }));
        }
      }
    } catch (error) {
      Logger.error('Ошибка при загрузке объявлений:', error);
      if (activePropertyTypeRef.current === 'all') {
        setProperties([]);
      }
      setFilteredProperties([]);
      setHasMore(prev => ({ ...prev, [activePropertyTypeRef.current]: false }));
      setTotalCount(prev => ({ ...prev, [activePropertyTypeRef.current]: 0 }));
      Alert.alert('Ошибка', 'Не удалось подключиться к серверу. Проверьте соединение.');
    } finally {
      requestInProgress.current.all = false;
      setLoading(false);
    }
  };

  // Тип для результатов кэша
  type TypeCacheResult = {
    data: Property[];
    totalCount: number;
    hasMore: boolean;
    timestamp: number;
    pageSize: number;
  };
  
  // Кэш для хранения последних результатов запросов по типу
  const typeCache = React.useRef<Record<'sale' | 'rent' | 'newBuildings', TypeCacheResult>>({
    sale: { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 },
    rent: { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 },
    newBuildings: { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 }
  });
  
  // Получение объявлений по типу (продажа/аренда/новостройки) с кэшированием
  const getPropertiesByType = async (type: 'sale' | 'rent' | 'newBuildings', page = 1, pageSize = 10): Promise<{
    data: Property[];
    totalCount: number;
    hasMore: boolean;
  }> => {
    // Сохраняем текущий тип сделки для использования в refreshProperties
    activePropertyTypeRef.current = type;
    
    // Для newBuildings используем отдельный кэш, но API вызываем с типом 'newBuildings'
    const cacheKey = type;
    
    // Проверяем существование ключа в typeCache
    if (!typeCache.current[cacheKey]) {
      Logger.debug(`Инициализация кэша для типа ${cacheKey}`);
      typeCache.current[cacheKey] = { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 };
    }
    
    // Обрабатываем случай, когда запрос уже выполняется
    if (requestInProgress.current[type === 'newBuildings' ? 'sale' : type]) {
      Logger.debug(`Запрос ${type} уже выполняется, возвращаем кэшированные данные`);
      const cached = typeCache.current[cacheKey];
      const isFresh = cached?.timestamp >= getCacheTimestamp();
      return isFresh ? cached : { data: [], totalCount: 0, hasMore: false };
    }
    
    // Используем кэш, если запрос был недавно и кэш свежее последней инвалидации в сервисе
    const now = Date.now();
    const cachedData = typeCache.current[cacheKey];
    const globalCacheVersion = getCacheTimestamp();
    
    if (page === 1 && 
        cachedData && 
        cachedData.data && 
        cachedData.data.length > 0 && 
        cachedData.timestamp >= globalCacheVersion &&
        now - cachedData.timestamp < MIN_FETCH_INTERVAL &&
        // Важно: если просим больший pageSize, чем в кэше, не используем кэш
        pageSize <= (cachedData.pageSize || cachedData.data.length)) {
      Logger.debug(`Возвращаем кэшированные данные для типа ${cacheKey}, обновлены ${Math.round((now - cachedData.timestamp)/1000)}с назад`);
      return cachedData;
    }
    
    try {
      requestInProgress.current[type === 'newBuildings' ? 'sale' : type] = true;
      setLoading(true);
      
      const result = await propertyService.getPropertiesByType(type, page, pageSize);
      if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data) && result.data.length > 0) {
        // Для первой страницы обновляем состояние приложения
        if (page === 1) {
          setCurrentPage(prev => ({ ...prev, [type]: 1 }));
          // Проверяем существование ключа в typeCache перед обновлением
          if (!typeCache.current[cacheKey]) {
            typeCache.current[cacheKey] = { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 };
          }
          // Обновляем кэш для данного типа
          typeCache.current[cacheKey] = {
            data: result.data as Property[],
            totalCount: (result as any).totalCount || 0,
            hasMore: (result as any).hasMore || false,
            timestamp: Date.now(),
            pageSize
          };
          cacheVersionRef.current = globalCacheVersion;
        } else {
          setCurrentPage(prev => ({ ...prev, [type]: page }));
        }
        
        setHasMore(prev => ({ ...prev, [type]: (result as any).hasMore || false }));
        setTotalCount(prev => ({ ...prev, [type]: (result as any).totalCount || 0 }));
        lastFetchTime.current[type === 'newBuildings' ? 'sale' : type] = Date.now();
        cacheVersionRef.current = getCacheTimestamp();
        
        return {
          data: result.data as Property[],
          totalCount: (result as any).totalCount || 0,
          hasMore: (result as any).hasMore || false
        };
      } else {
        setHasMore(prev => ({ ...prev, [type]: false }));
        setTotalCount(prev => ({ ...prev, [type]: 0, newBuildings: 0 }));
        return { data: [], totalCount: 0, hasMore: false };
      }
    } catch (error) {
      Logger.error(`Ошибка при загрузке объявлений типа ${type}:`, error);
      // Показываем Alert только если это первая страница
      if (page === 1) {
        const typeLabel = type === 'sale' ? 'продажа' : type === 'rent' ? 'аренда' : 'новостройки';
        Alert.alert('Ошибка', `Не удалось загрузить объявления типа ${typeLabel}`);
      }
      
      // Проверяем существование и наличие данных в кэше
      const cachedData = typeCache.current[cacheKey];
      if (!cachedData) {
        typeCache.current[cacheKey] = { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 };
      }
      
      // Возвращаем кэш или пустой результат, если кэша нет
      return (typeCache.current[cacheKey] && typeCache.current[cacheKey].data && typeCache.current[cacheKey].data.length > 0) 
        ? {
            data: typeCache.current[cacheKey].data || [],
            totalCount: typeCache.current[cacheKey].totalCount || 0,
            hasMore: typeCache.current[cacheKey].hasMore || false
          }
        : { data: [], totalCount: 0, hasMore: false };
    } finally {
      requestInProgress.current[type === 'newBuildings' ? 'sale' : type] = false;
      setLoading(false);
    }
  };

  // RU: Плавная догрузка (пагинация) без debounce. Защита от параллельных запросов через requestInProgress.
  // EN: Smooth pagination without debounce. Uses requestInProgress to prevent parallel requests.
  const loadMoreProperties = async (type: 'all' | 'sale' | 'rent' | 'newBuildings' = 'all') => {
    // Не загружаем, если нет больше данных, или уже выполняется запрос для этого типа
    const typeKey = type === 'newBuildings' ? 'sale' : type;
    if (!hasMore[type] || requestInProgress.current[typeKey as 'all' | 'sale' | 'rent']) return;
    
    try {
      requestInProgress.current[typeKey as 'all' | 'sale' | 'rent'] = true;
      Logger.debug(`Загрузка дополнительных объявлений типа ${type}, страница ${currentPage[type] + 1}`);
      
      let result;
      if (type === 'all') {
        result = await propertyService.getProperties(currentPage.all + 1, pageSize);
      } else {
        result = await propertyService.getPropertiesByType(type, currentPage[type] + 1, pageSize);
      }
      
      if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data) && result.data.length > 0) {
        // RU: Критично: используем функциональный setState, чтобы не потерять элементы при быстрых апдейтах.
        // EN: Critical: use functional setState to avoid losing items during rapid updates.
        if (type === 'all') {
          // Добавляем новые объявления к существующим
          setProperties(prev => [...prev, ...(result.data as Property[])]);
          if (activePropertyTypeRef.current === 'all') {
            setFilteredProperties(prev => [...prev, ...(result.data as Property[])]);
          }
        } else {
          // RU: Для 'sale'/'rent'/'newBuildings' обновляем основной и при необходимости фильтрованный список, избегая дублей.
          // EN: For 'sale'/'rent'/'newBuildings' update main and active filtered lists, deduplicating items.
          // Обновляем общий список объявлений
          setProperties(prev => {
            // Фильтруем, чтобы избежать дубликатов
            const existingIds = new Set(prev.map((p: Property) => p.id));
            const newItems = (result.data as Property[]).filter((item: Property) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
          
          // Обновляем только если активный тип совпадает с типом загруженных данных
          if (activePropertyTypeRef.current === type) {
            setFilteredProperties(prev => {
              // Фильтруем, чтобы избежать дубликатов
              const existingIds = new Set(prev.map((p: Property) => p.id));
              const newItems = (result.data as Property[]).filter((item: Property) => !existingIds.has(item.id));
              return [...prev, ...newItems];
            });
          }
        }
        
        // RU: Обновляем состояние пагинации (текущая страница, hasMore, totalCount)
        // EN: Update pagination state (current page, hasMore, totalCount)
        setCurrentPage(prev => ({ ...prev, [type]: prev[type] + 1 }));
        setHasMore(prev => ({ ...prev, [type]: (result as any).hasMore || false }));
        setTotalCount(prev => ({ ...prev, [type]: (result as any).totalCount || 0 }));
        
        Logger.debug(`Загружено дополнительно ${result.data.length} объявлений типа ${type}`);
      }
    } catch (error) {
      Logger.error(`Ошибка при загрузке дополнительных объявлений типа ${type}:`, error);
      Alert.alert('Ошибка', 'Не удалось загрузить дополнительные объявления');
    } finally {
      requestInProgress.current[typeKey as 'all' | 'sale' | 'rent'] = false;
    }
  };

  // RU: Примечание: при необходимости ограничиваем частоту вызова на уровне UI (см. HomeScreen: троттлинг onEndReached)
  // EN: Note: limit call frequency at UI level if needed (see HomeScreen: throttled onEndReached)

  // Функция для принудительного обновления кэша после добавления объявления
  const invalidateCache = useCallback(async () => {
    // Очищаем кэш в propertyService
    propertyService.clearCache();
    // Сбрасываем локальные кэши и таймеры
    cacheVersionRef.current = getCacheTimestamp();
    lastFetchTime.current = {
      all: 0,
      sale: 0,
      rent: 0,
      newBuildings: 0
    };
    typeCache.current = {
      sale: { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 },
      rent: { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 },
      newBuildings: { data: [], totalCount: 0, hasMore: false, timestamp: 0, pageSize: 0 }
    };
    
    // Сбрасываем текущее состояние
    setCurrentPage({
      all: 1,
      sale: 1,
      rent: 1,
      newBuildings: 1
    });
    
    // Перезагружаем данные
    await refreshProperties();
    
    Logger.debug('Кэш объявлений обновлен после создания нового объявления');
  }, [refreshProperties]);

  // Загрузка районов выбранного города с кэшированием по city_id
  const loadDistricts = useCallback(async (cityId?: number | string | null) => {
    if (!cityId && cityId !== 0) {
      setDistricts([]);
      setDistrictsCityId(null);
      return [];
    }

    const numericId = typeof cityId === 'string' ? Number(cityId) : cityId;
    const selectedCityId = selectedCity ? Number(selectedCity.id) : null;
    const shouldUpdateState = selectedCityId !== null && !Number.isNaN(selectedCityId) && selectedCityId === numericId;
    if (Number.isNaN(numericId)) {
      Logger.warn('Некорректный cityId для загрузки районов', cityId);
      setDistricts([]);
      setDistrictsCityId(null);
      return [];
    }

    if (shouldUpdateState && districtsCityId === numericId && districts.length > 0) {
      return districts;
    }

    if (shouldUpdateState) {
      setDistrictsLoading(true);
    }
    try {
      const data = await propertyService.getDistricts(numericId);
      if (shouldUpdateState) {
        setDistricts(data || []);
        setDistrictsCityId(numericId);
      }
      return data || [];
    } catch (error) {
      Logger.error('Ошибка при загрузке районов:', error);
      if (shouldUpdateState) {
        setDistricts([]);
      }
      return [];
    } finally {
      if (shouldUpdateState) {
        setDistrictsLoading(false);
      }
    }
  }, [districts, districtsCityId, selectedCity]);

  // Загрузка списка городов с кэшированием
  const loadCities = useCallback(async () => {
    if (cities.length > 0) {
      // Если города уже загружены, возвращаем их из кэша
      return cities;
    }
    
    setCitiesLoading(true);
    try {
      const { data: citiesData, error } = await supabase
        .from('cities')
        .select('*');

      if (error) {
        Logger.error('Error fetching cities:', error);
        setCitiesLoading(false);
        return [];
      }

      if (citiesData) {
        // Добавляем координаты для городов
        const citiesWithCoordinates = citiesData.map((city: any) => ({
          ...city,
          latitude: city.latitude || '45.267136',
          longitude: city.longitude || '19.833549',
          coordinates: city.coordinates || { lat: parseFloat(city.latitude || '45.267136'), lng: parseFloat(city.longitude || '19.833549') }
        }));
        
        setCities(citiesWithCoordinates);
        setCitiesLoading(false);
        return citiesWithCoordinates;
      }
    } catch (error) {
      Logger.error('Error in loadCities:', error);
      setCitiesLoading(false);
    }
    return [];
  }, [cities]);

  // Автозагрузка и валидация районов при смене города
  // Автозагрузка районов при смене города.
  // Внимание: loadDistricts обновляет локальный стейт, поэтому не добавляем его в зависимости, чтобы избежать бесконечных ререндеров.
  // selectedDistrict также убран из зависимостей — его валидация происходит только при смене города.
  useEffect(() => {
    if (!selectedCity) {
      setSelectedDistrict(null);
      setDistricts([]);
      setDistrictsCityId(null);
      setDistrictsLoading(false);
      return;
    }

    const numericId = Number(selectedCity.id);
    if (Number.isNaN(numericId)) {
      setSelectedDistrict(null);
      setDistricts([]);
      setDistrictsCityId(null);
      setDistrictsLoading(false);
      return;
    }

    // Сбрасываем район, если он не принадлежит новому городу
    setSelectedDistrict((prev) => {
      if (prev && prev.city_id !== numericId) {
        return null;
      }
      return prev;
    });

    loadDistricts(numericId).catch((error) => Logger.error('Ошибка автозагрузки районов:', error));
  }, [selectedCity]);
  
  // Загрузка объявления по ID для открытия по ссылке
  const fetchPropertyById = useCallback(async (id: string): Promise<Property | null> => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          user:users(name, phone, is_agency),
          city:cities(name),
          district:districts(id, name, city_id),
          agency:agency_profiles(id, name, phone, logo_url, description, website, instagram, facebook)
        `)
        .eq('id', id)
        .single();

      if (error) {
        Logger.error('Ошибка при загрузке объявления по ID:', error);
        return null;
      }

      if (!data) {
        return null;
      }
      
      // Преобразуем данные в формат Property
      const formattedProperty = {
        ...(data as any),
        images: (data as any).images || []
      } as Property;

      return formattedProperty;
    } catch (error) {
      Logger.error('Ошибка при загрузке объявления:', error);
      return null;
    }
  }, []);

  return (
    <PropertyContext.Provider 
      value={{
        properties,
        filteredProperties,
        loading,
        selectedCity,
        setSelectedCity,
        selectedDistrict,
        setSelectedDistrict,
        getPropertiesByType,
        setFilteredProperties,
        refreshProperties,
        // RU: Возвращаем асинхронную версию без debounce для стабильной догрузки
        // EN: Expose async version without debounce for stable pagination
        loadMoreProperties,
        invalidateCache,
        // RU: Селектор наличия следующей страницы по типу (all/sale/rent/newBuildings)
        // EN: Selector for whether more pages exist per type
        getHasMore: (type?: 'all' | 'sale' | 'rent' | 'newBuildings') => hasMore[type || activePropertyTypeRef.current],
        totalProperties: totalCount[activePropertyTypeRef.current],
        cities,
        loadCities,
        citiesLoading,
        districts,
        loadDistricts,
        districtsLoading,
        fetchPropertyById
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperties() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperties должен использоваться внутри PropertyProvider');
  }
  return context;
}
