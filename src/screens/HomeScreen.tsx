import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, ScrollView, TouchableOpacity, Platform, useWindowDimensions, ViewStyle, Image, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import PropertyCard from '../components/PropertyCard';
import PropertyCardCompact from '../components/PropertyCardCompact';
import type { Property, District } from '../contexts/PropertyContext';
import FilterModal from '../components/FilterModal';
import { useFavorites } from '../contexts/FavoritesContext';
import { useProperties } from '../contexts/PropertyContext';
import { useTheme } from '../contexts/ThemeContext';
import Colors from '../constants/colors';
import { applyPropertyFilters } from '../utils/filterHelpers';
import { Logger } from '../utils/logger';

type DealTab = 'sale' | 'rent' | 'newBuildings';
type ViewTab = 'all' | DealTab | 'agencies';

type DealFilters = {
  propertyTypes: string[];
  price: number[];
  rooms: string[];
  areas: number[];
  features: string[];
};

interface AgencySummary {
  id: string;
  name: string | null;
  logo_url: string | null;
  location: string | null;
  phone: string | null;
  city?: { id: number; name: string }[] | null;
}

const HomeScreen = ({ navigation }: any) => {
  // Вернулись к использованию стандартного компонента PropertyCard
  const { t } = useTranslation();
  const { isLoading: favoritesLoading } = useFavorites();
  const {
    properties,
    filteredProperties,
    setFilteredProperties,
    refreshProperties,
    loading: propertiesLoading,
    selectedCity,
    selectedDistrict,
    setSelectedDistrict,
    loadMoreProperties,
    getHasMore,
    getPropertiesByType,
    districts,
    loadDistricts,
    districtsLoading
  } = useProperties();
  const [propertyType, setPropertyType] = useState<ViewTab>('all');
  const [categoryByType, setCategoryByType] = useState<Record<DealTab, string>>(() => ({
    sale: 'all',
    rent: 'all',
    newBuildings: 'all',
  }));
  const getCategoryForType = (type: DealTab) => categoryByType[type];
  const setCategoryForType = (type: DealTab, category: string) => {
    setCategoryByType(prev => {
      if (prev[type] === category) {
        return prev;
      }
      return { ...prev, [type]: category };
    });
  };
  const isDealView = propertyType === 'sale' || propertyType === 'rent' || propertyType === 'newBuildings';
  const isAgencyView = propertyType === 'agencies';
  const propertyCategory = isDealView ? getCategoryForType(propertyType) : 'all';
  const propertyTypeForData: 'all' | DealTab = isDealView ? propertyType : 'all';
  const showQuickFilters = propertyType === 'sale' || propertyType === 'rent';
  const showFilterActions = propertyType === 'sale' || propertyType === 'rent' || propertyType === 'newBuildings';
  // Локальная база данных для вкладок sale/rent, чтобы не зависеть от глобального properties
  const [typeItems, setTypeItems] = useState<Property[]>([]);
  const { darkMode } = useTheme();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [loadingMore, setLoadingMore] = useState(false);
  const [compactView, setCompactView] = useState(false); // Состояние для переключения режима отображения
  const [filtersAppliedSale, setFiltersAppliedSale] = useState(false); // Флаг для отслеживания применения фильтров продажи
  const [filtersAppliedRent, setFiltersAppliedRent] = useState(false); // Флаг для отслеживания применения фильтров аренды
  const flatListRef = useRef<FlatList<any>>(null); // Ссылка на FlatList для программного управления прокруткой
  const scrollOffsetRef = useRef(0); // Для сохранения позиции прокрутки
  const lastLoadMoreAtRef = useRef<number>(0); // Для троттлинга onEndReached
  const LOAD_MORE_MIN_INTERVAL = 800; // мс
  // Троттлинг onEndReached во избежание частых вызовов, которые ведут к рывкам скролла.

  // Состояние для фильтров аренды
  const [rentFilters, setRentFilters] = useState<DealFilters>({
    propertyTypes: [],
    price: [0, 3000],
    rooms: [],
    areas: [],
    features: []
  });

  // Состояние для фильтров продажи
  const [saleFilters, setSaleFilters] = useState<DealFilters>({
    propertyTypes: [],
    price: [0, 500000],
    rooms: [],
    areas: [],
    features: []
  });

  // Активные фильтры в зависимости от выбранной вкладки
  const [activeFilters, setActiveFilters] = useState<DealFilters>({
    propertyTypes: [],
    price: [0, 3000],
    rooms: [],
    areas: [],
    features: []
  });

  // Состояние для модального окна фильтров
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState<DealFilters>({
    propertyTypes: [],
    price: [0, 3000],
    rooms: [],
    areas: [],
    features: []
  });
  const [districtModalVisible, setDistrictModalVisible] = useState(false);

  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [agenciesError, setAgenciesError] = useState<string | null>(null);

  const fetchAgencies = useCallback(async () => {
    try {
      setAgenciesLoading(true);
      setAgenciesError(null);
      const { data, error } = await supabase
        .from('agency_profiles')
        .select('id, name, logo_url, location, phone, city:cities(id, name)')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setAgencies((data as AgencySummary[]) ?? []);
    } catch (error) {
      Logger.error('Ошибка загрузки агентств:', error);
      setAgencies([]);
      setAgenciesError(t('agency.loadError', 'Не удалось загрузить агентства'));
    } finally {
      setAgenciesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (propertyType === 'agencies' && !agenciesLoading && agencies.length === 0) {
      fetchAgencies();
    }
  }, [propertyType, agencies.length, agenciesLoading, fetchAgencies]);

  const agenciesForList = useMemo(() => {
    if (!selectedCity) return agencies;
    return agencies.filter((agency) => {
      if (agency.city && Array.isArray(agency.city) && agency.city.length > 0) {
        return agency.city.some(c => c.id === selectedCity.id);
      }
      return false;
    });
  }, [agencies, selectedCity]);

  // Мемоизированная функция для фильтрации объектов недвижимости
  // использует вынесенную логику из filterHelpers.ts
  const applyFilters = useCallback(() => {
    if (propertyType === 'agencies') {
      return;
    }
    // Базовый источник: вкладка "Все" -> global properties; вкладки sale/rent/newBuildings -> локальные typeItems
    const base = propertyTypeForData === 'all' ? properties : typeItems;
    if (base.length > 0) {
      // Не применяем пользовательские фильтры на Продажа/Аренда, пока их явно не применили
      const emptyFilters = { propertyTypes: [], price: [], rooms: [], areas: [], features: [] } as any;
      // Определяем, заданы ли какие-либо пользовательские фильтры (по факту непустых массивов)
      const hasUserFilters =
        (activeFilters.propertyTypes?.length ?? 0) > 0 ||
        (activeFilters.rooms?.length ?? 0) > 0 ||
        (activeFilters.features?.length ?? 0) > 0 ||
        (activeFilters.areas?.length ?? 0) > 0 ||
        ((activeFilters.price?.length ?? 0) > 0);
      // ВАЖНО: используем активные фильтры, если есть пользовательские фильтры, выбрана категория,
      // или фильтры были явно применены
      const isRentView = propertyType === 'rent';
      const isSaleLikeView = propertyType === 'sale' || propertyType === 'newBuildings';
      const shouldUseActive =
        hasUserFilters || (isDealView && propertyCategory !== 'all') ||
        (isRentView ? filtersAppliedRent : isSaleLikeView ? filtersAppliedSale : false);
      const filtersForApply = shouldUseActive ? activeFilters : emptyFilters;
      const filtered = applyPropertyFilters(
        base,
        propertyTypeForData,
        propertyCategory,
        selectedCity,
        selectedDistrict,
        filtersForApply
      );
      setFilteredProperties(filtered);
    } else if (propertyType !== 'all') {
      // Если пока нет локальной базы для sale/rent, не перетираем список
      return;
    }
  }, [propertyType, propertyCategory, selectedCity, selectedDistrict, properties, typeItems, activeFilters, filtersAppliedRent, filtersAppliedSale]);

  // Используем debounce для applyFilters, чтобы не вызывать фильтрацию слишком часто
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Применяем фильтры при изменении зависимостей с debounce
  useEffect(() => {
    // Очищаем предыдущий таймер, если он был установлен
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Устанавливаем новый таймер для фильтрации с задержкой
    // ВАЖНО: автофильтрацию через debounce применяем только для вкладки "Все",
    // чтобы не перетирать результаты во вкладках Продажа/Аренда
    debounceTimeout.current = setTimeout(() => {
      if (propertyType === 'all') {
        applyFilters();
      }
    }, 300);

    // Очистка таймера при размонтировании компонента
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [applyFilters, propertyType]);

  // МГНОВЕННАЯ реакция на смену города во вкладках Продажа/Аренда/Новостройки
  // Во вкладке "Все" уже есть debounce-логика выше
  useEffect(() => {
    if (propertyType === 'sale' || propertyType === 'rent' || propertyType === 'newBuildings') {
      const base = typeItems;
      if (base.length === 0) return;
      // Не применять фильтры до явного действия пользователя
      const emptyFilters = { propertyTypes: [], price: [], rooms: [], areas: [], features: [] } as any;
      const hasUserFilters =
        (activeFilters.propertyTypes?.length ?? 0) > 0 ||
        (activeFilters.rooms?.length ?? 0) > 0 ||
        (activeFilters.features?.length ?? 0) > 0 ||
        (activeFilters.areas?.length ?? 0) > 0 ||
        ((activeFilters.price?.length ?? 0) > 0);
      // ВАЖНО: используем активные фильтры, если есть пользовательские фильтры, выбрана категория,
      // или фильтры были явно применены
      const shouldUseActive =
        hasUserFilters || (propertyCategory !== 'all') ||
        (propertyType === 'rent' ? filtersAppliedRent : (propertyType === 'sale' || propertyType === 'newBuildings') ? filtersAppliedSale : false);
      const filtersForApply = shouldUseActive ? activeFilters : emptyFilters;
      const filtered = applyPropertyFilters(
        base,
        propertyType,
        propertyCategory,
        selectedCity,
        selectedDistrict,
        filtersForApply
      );
      setFilteredProperties(filtered);
    }
  }, [selectedCity, selectedDistrict, propertyType, propertyCategory, activeFilters, typeItems, filtersAppliedRent, filtersAppliedSale]);

  useEffect(() => {
    if (propertyType === 'rent') {
      setActiveFilters(rentFilters);
      setTempFilters(rentFilters);
      // Не применять фильтры автоматически при выборе вкладки "Аренда"
      setFiltersAppliedRent(false);
    } else if (propertyType === 'sale' || propertyType === 'newBuildings') {
      setActiveFilters(saleFilters);
      setTempFilters(saleFilters);
      // Не применять фильтры автоматически при выборе вкладки "Продажа"
      setFiltersAppliedSale(false);
    } else {
      // Для вкладки "Все" используем пустые фильтры
      setActiveFilters({
        propertyTypes: [],
        price: [0, 3000],
        rooms: [],
        areas: [],
        features: []
      });
      setTempFilters({
        propertyTypes: [],
        price: [0, 3000],
        rooms: [],
        areas: [],
        features: []
      });
      setFiltersAppliedSale(false);
      setFiltersAppliedRent(false);
    }
  }, [propertyType, rentFilters, saleFilters]);

  // Предотвращаем множественные запросы в handleCombinedFilter
  // Используем useRef для отслеживания последнего запроса
  const lastFilterRequest = React.useRef({ type: '', category: '', timestamp: 0 });
  const FILTER_THROTTLE_MS = 300; // 300ms задержка между запросами

  const handleCombinedFilter = async (type: 'sale' | 'rent', category: string) => {
    const now = Date.now();

    // Пропускаем частые запросы с одинаковыми параметрами
    if (lastFilterRequest.current.type === type &&
      lastFilterRequest.current.category === category &&
      now - lastFilterRequest.current.timestamp < FILTER_THROTTLE_MS) {
      Logger.debug(`Пропускаем дублирующий запрос фильтра: ${type} - ${category}`);
      return;
    }

    // Обновляем данные о последнем запросе
    lastFilterRequest.current = { type, category, timestamp: now };

    setPropertyType(type);
    setCategoryForType(type, category);

    // Синхронизация с обычными фильтрами
    if (category !== 'all') {
      if (type === 'sale') {
        const updatedFilters = {
          ...saleFilters,
          propertyTypes: [category]
        };
        setSaleFilters(updatedFilters);
        setActiveFilters(updatedFilters);
      } else if (type === 'rent') {
        const updatedFilters = {
          ...rentFilters,
          propertyTypes: [category]
        };
        setRentFilters(updatedFilters);
        setActiveFilters(updatedFilters);
      }
    }

    setLoadingMore(true);

    try {
      // Загружаем объявления выбранного типа (первая страница) с расширенным лимитом,
      // чтобы пользователь видел больше результатов сразу
      const { data } = await getPropertiesByType(type, 1, 30);

      // Проверяем, не устарел ли наш запрос (другой мог стартовать пока этот выполнялся)
      if (lastFilterRequest.current.type !== type ||
        lastFilterRequest.current.category !== category) {
        Logger.debug('Запрос устарел, пропускаем обработку результатов');
        return;
      }

      // Обновляем локальную базу для текущего типа
      setTypeItems(data);
      let filtered = [...data];

      // Фильтрация по категории
      if (category !== 'all') {
        filtered = filtered.filter(prop =>
          prop.property_type === category
        );
      }

      // Фильтрация по городу - с максимальной защитой от ошибок
      if (selectedCity && selectedCity?.id) {
        // Заранее преобразуем id города в строку один раз
        const cityIdStr = String(selectedCity.id);

        filtered = filtered.filter(prop => {
          // Проверяем все возможные случаи null/undefined
          if (!prop || prop.city_id === undefined || prop.city_id === null) {
            return false;
          }

          try {
            // Преобразуем id свойства в строку
            const propCityIdStr = String(prop.city_id);
            return propCityIdStr === cityIdStr;
          } catch (error) {
            Logger.error('Ошибка при фильтрации по городу:', error);
            return false;
          }
        });
      }

      if (selectedDistrict && selectedDistrict.id) {
        const districtIdStr = String(selectedDistrict.id);
        filtered = filtered.filter((prop) => {
          try {
            const propDistrictId = (prop as any).district_id || (prop as any).district?.id;
            if (!propDistrictId) {
              return false;
            }
            return String(propDistrictId) === districtIdStr;
          } catch (error) {
            Logger.error('Ошибка при фильтрации по району:', error);
            return false;
          }
        });
      }

      // Применение активных фильтров только если они были явно применены
      if (activeFilters && Object.keys(activeFilters).length > 0) {
        filtered = applyActiveFilters(filtered, type);
      } else if (type === 'sale' || type === 'rent') {
        // Если фильтры не были применены, просто фильтруем по типу
        filtered = filtered.filter(prop => prop.type === type);
      }

      setFilteredProperties(filtered);
    } catch (error) {
      Logger.error('Ошибка при фильтрации:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const applyActiveFilters = (properties: any[], type: 'all' | 'sale' | 'rent') => {
    // Получаем активные фильтры в зависимости от типа
    const filters = type === 'rent' ? rentFilters :
      type === 'sale' ? saleFilters :
        activeFilters;

    // Проверяем, были ли применены фильтры для данного типа
    const filtersApplied = type === 'rent' ? filtersAppliedRent :
      type === 'sale' ? filtersAppliedSale :
        false;

    // Если фильтры не были явно применены, возвращаем только фильтрацию по типу
    if (!filtersApplied && type !== 'all') {
      return properties.filter(prop => prop.type === type);
    }

    // Делегируем единому helper-у, чтобы логика совпадала везде (включая "5+" для комнат)
    return applyPropertyFilters(
      properties,
      type,
      propertyCategory,
      selectedCity,
      selectedDistrict,
      filters
    );
  };

  const handleClearFilters = async () => {
    // Сбрасываем все фильтры
    if (propertyType === 'sale' || propertyType === 'newBuildings') {
      setSaleFilters({
        propertyTypes: [],
        price: [0, 500000],
        rooms: [],
        areas: [],
        features: []
      });
      setActiveFilters({
        propertyTypes: [],
        price: [0, 500000],
        rooms: [],
        areas: [],
        features: []
      });
      setFiltersAppliedSale(false);
    } else if (propertyType === 'rent') {
      setRentFilters({
        propertyTypes: [],
        price: [0, 3000],
        rooms: [],
        areas: [],
        features: []
      });
      setActiveFilters({
        propertyTypes: [],
        price: [0, 3000],
        rooms: [],
        areas: [],
        features: []
      });
      setFiltersAppliedRent(false);
    }

    // Сбрасываем категорию недвижимости
    if (propertyType === 'sale' || propertyType === 'newBuildings') {
      setCategoryForType(propertyType, 'all');
    } else if (propertyType === 'rent') {
      setCategoryForType('rent', 'all');
    }

    // Применяем фильтрацию заново, получая актуальные данные из сервиса по текущему типу
    try {
      if (propertyType === 'sale' || propertyType === 'rent' || propertyType === 'newBuildings') {
        const { data } = await getPropertiesByType(propertyType, 1, 30);
        // Обновляем локальную базу текущего типа
        setTypeItems(data);
        // Применяем фильтр по городу при сбросе, если выбран город
        let list = [...data];
        if (selectedCity && selectedCity.id) {
          const cityIdStr = String(selectedCity.id);
          list = list.filter(p => {
            if (!p || p.city_id === undefined || p.city_id === null) return false;
            try { return String(p.city_id) === cityIdStr; } catch { return false; }
          });
        }
        if (selectedDistrict && selectedDistrict.id) {
          const districtIdStr = String(selectedDistrict.id);
          list = list.filter((p) => {
            try {
              const propDistrictId = (p as any).district_id || (p as any).district?.id;
              if (!propDistrictId) return false;
              return String(propDistrictId) === districtIdStr;
            } catch {
              return false;
            }
          });
        }
        setFilteredProperties(list);
      } else {
        // Для вкладки "Все" оставляем текущую стратегию
        if (properties.length > 0) {
          setFilteredProperties(properties);
        }
      }
    } catch (e) {
      Logger.error('Ошибка при сбросе фильтров и обновлении данных:', e);
    }
  };

  const handleTempFiltersChange = (newFilters: DealFilters) => {
    setTempFilters(newFilters);
  };

  const handleOpenFilterModal = () => {
    if (isAgencyView) {
      return;
    }
    // Загружаем текущие фильтры в зависимости от выбранной вкладки
    if (propertyType === 'rent') {
      setTempFilters({ ...rentFilters });
    } else if (propertyType === 'sale' || propertyType === 'newBuildings') {
      setTempFilters({ ...saleFilters });
    } else {
      setTempFilters({
        propertyTypes: [],
        price: [0, 3000],
        rooms: [],
        areas: [],
        features: []
      });
    }
    setFilterModalVisible(true);
  };

  const handleOpenDistrictModal = async () => {
    if (!selectedCity) {
      return;
    }
    try {
      await loadDistricts(selectedCity.id);
    } catch (error) {
      Logger.error('Ошибка загрузки районов перед открытием модального окна:', error);
    }
    setDistrictModalVisible(true);
  };

  const handleSelectDistrict = (district: District | null) => {
    setSelectedDistrict(district);
    setDistrictModalVisible(false);
  };

  const handleCloseFilterModal = () => {
    setFilterModalVisible(false);
  };

  const handleApplyFilters = (appliedFilters: DealFilters) => {
    if (isAgencyView) {
      return;
    }
    // Закрываем модальное окно
    setFilterModalVisible(false);

    // Вычисляем категорию немедленно, чтобы избежать гонки состояния
    const categoryToApply =
      appliedFilters.propertyTypes && appliedFilters.propertyTypes.length === 1
        ? appliedFilters.propertyTypes[0]
        : 'all';

    setTempFilters(appliedFilters);

    // Обновляем активные фильтры в зависимости от выбранной вкладки
    if (propertyType === 'sale' || propertyType === 'newBuildings') {
      setSaleFilters(appliedFilters);
      setActiveFilters(appliedFilters);
      setFiltersAppliedSale(true);
      // Синхронизация с быстрыми фильтрами
      setCategoryForType(propertyType, categoryToApply);
    } else if (propertyType === 'rent') {
      setRentFilters(appliedFilters);
      setActiveFilters(appliedFilters);
      setFiltersAppliedRent(true);
      // Синхронизация с быстрыми фильтрами
      setCategoryForType('rent', categoryToApply);
    }

    // Применяем фильтрацию c учётом выбранного города и баз данных вкладок
    const base = propertyTypeForData === 'all' ? properties : typeItems;
    if (base.length > 0) {
      // Используем общий helper, который учитывает selectedCity
      const filtered = applyPropertyFilters(
        base,
        propertyTypeForData,
        categoryToApply,
        selectedCity,
        selectedDistrict,
        propertyType === 'sale' || propertyType === 'newBuildings' ? appliedFilters : propertyType === 'rent' ? appliedFilters : activeFilters
      );
      setFilteredProperties(filtered);
    }
  };

  const areFiltersApplied = () => {
    if (isAgencyView) {
      return false;
    }
    // Проверяем, выбрана ли категория (отличная от 'all')
    if (propertyCategory !== 'all') {
      return true;
    }
    if (propertyType === 'rent') {
      // Проверяем, отличаются ли текущие фильтры от значений по умолчанию
      return (
        rentFilters.propertyTypes.length > 0 ||
        rentFilters.rooms.length > 0 ||
        rentFilters.areas.length > 0 ||
        rentFilters.features.length > 0 ||
        rentFilters.price[0] !== 0 ||
        rentFilters.price[1] !== 3000
      );
    } else if (propertyType === 'sale' || propertyType === 'newBuildings') {
      // Проверяем, отличаются ли текущие фильтры от значений по умолчанию
      return (
        saleFilters.propertyTypes.length > 0 ||
        saleFilters.rooms.length > 0 ||
        saleFilters.areas.length > 0 ||
        saleFilters.features.length > 0 ||
        saleFilters.price[0] !== 0 ||
        saleFilters.price[1] !== 500000
      );
    }
    return false;
  };

  // Функция для открытия полноэкранной карты
  const handleOpenMap = () => {
    // Если выбран город, открываем карту с этим городом
    // Если город не выбран, открываем карту Белграда по умолчанию
    const cityForMap = selectedCity || {
      id: 1,
      name: 'Белград',
      latitude: '44.787197',
      longitude: '20.457273'
    };

    navigation.navigate('Map', {
      selectedCity: cityForMap,
      selectedDistrict,
      properties: filteredProperties
    });
  };

  const loading = propertiesLoading || favoritesLoading;

  // Для отслеживания изменений в списке объявлений и восстановления позиции прокрутки
  const prevPropertiesCountRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  // Мемоизированный обработчик изменения размера контента FlatList
  const handleContentSizeChange = useCallback(() => {
    Logger.debug('Изменился размер списка: ', {
      'Текущая позиция прокрутки': scrollOffsetRef.current,
    });

    // Восстанавливаем позицию прокрутки если размер списка изменился и флаг восстановления установлен
    if (shouldRestoreScrollRef.current && scrollOffsetRef.current > 0) {
      Logger.debug('Восстанавливаем позицию при изменении размера:', scrollOffsetRef.current);
      flatListRef.current?.scrollToOffset({
        offset: scrollOffsetRef.current,
        animated: false
      });
      shouldRestoreScrollRef.current = false;
    }
  }, []);

  useEffect(() => {
    let scrollTimeoutId: NodeJS.Timeout | null = null;

    if (filteredProperties.length > 0) {
      Logger.debug('Обновление списка объявлений: ', {
        'Предыдущий размер': prevPropertiesCountRef.current,
        'Новый размер': filteredProperties.length,
        'Текущая позиция прокрутки': scrollOffsetRef.current,
        'Тип просматриваемых объявлений': propertyType,
        'Восстановить позицию?': shouldRestoreScrollRef.current
      });

      // Если размер увеличился (загрузили новые объявления) и позиция прокрутки не в начале,
      // восстановим позицию прокрутки
      if (filteredProperties.length > prevPropertiesCountRef.current && shouldRestoreScrollRef.current) {
        shouldRestoreScrollRef.current = false;

        // Небольшая задержка для уверенности, что список обновился
        scrollTimeoutId = setTimeout(() => {
          if (flatListRef.current && scrollOffsetRef.current > 0) {
            Logger.debug('Восстанавливаем позицию прокрутки на:', scrollOffsetRef.current);
            flatListRef.current.scrollToOffset({
              offset: scrollOffsetRef.current,
              animated: false
            });
          }
        }, 100);
      }

      prevPropertiesCountRef.current = filteredProperties.length;
    }

    return () => {
      if (scrollTimeoutId) {
        clearTimeout(scrollTimeoutId);
      }
    };
  }, [filteredProperties, propertyType]);

  // Обработка загрузки дополнительных объявлений с сохранением позиции прокрутки
  // Восстанавливаем позицию скролла после догрузки; дожидаемся await loadMoreProperties для стабильности.
  const handleLoadMore = useCallback(async () => {
    if (isAgencyView) {
      return;
    }
    const now = Date.now();
    // Троттлинг быстрых повторных вызовов
    if (now - lastLoadMoreAtRef.current < LOAD_MORE_MIN_INTERVAL) {
      return;
    }
    if (!loadingMore && getHasMore(propertyTypeForData)) {
      const currentOffset = scrollOffsetRef.current;
      Logger.debug('Начало загрузки дополнительных объявлений: ', {
        'Тип': propertyTypeForData,
        'Текущая позиция прокрутки': currentOffset
      });

      // Устанавливаем флаг, что нужно восстановить позицию прокрутки после загрузки
      shouldRestoreScrollRef.current = true;

      setLoadingMore(true);
      try {
        await loadMoreProperties(propertyTypeForData);
        Logger.debug('Загрузка завершена: ', {
          'Новая позиция прокрутки': scrollOffsetRef.current,
          'Разница': scrollOffsetRef.current - currentOffset
        });
        // Примечание: filteredProperties и properties обновляются контекстом; debounce не перетирает вкладки sale/rent
      } finally {
        lastLoadMoreAtRef.current = Date.now();
        setLoadingMore(false);
      }
    }
  }, [isAgencyView, loadingMore, getHasMore, propertyTypeForData, loadMoreProperties]);

  // Web-responsive helpers (без влияния на mobile)
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 1024;
  const isTabletWeb = isWeb && width >= 768 && width < 1024;

  const propertyTypeCardAdaptiveStyle = isDesktop
    ? styles.propertyTypeCardWeb
    : isTabletWeb
      ? styles.propertyTypeCardTablet
      : isWeb
        ? styles.propertyTypeCardSmallWeb
        : null;

  const propertyTypeIconContainerStyle = isDesktop
    ? styles.iconContainerWeb
    : isTabletWeb
      ? styles.iconContainerTablet
      : isWeb
        ? styles.iconContainerSmallWeb
        : null;

  const agencyColumns = isWeb ? (isDesktop ? 3 : isTabletWeb ? 2 : 1) : 1;

  const propertyTypeTextStyle = isDesktop
    ? styles.propertyTypeTextWeb
    : isTabletWeb
      ? styles.propertyTypeTextTablet
      : isWeb
        ? styles.propertyTypeTextSmallWeb
        : null;

  const filterRowAdaptiveStyle = isDesktop
    ? styles.webFilterRowContainer
    : isTabletWeb
      ? styles.webFilterRowContainerTablet
      : isWeb
        ? styles.webFilterRowContainerSmall
        : null;

  const uniformButtonAdaptiveStyle = isDesktop
    ? styles.webUniformButton
    : isTabletWeb
      ? styles.webUniformButtonTablet
      : isWeb
        ? styles.webUniformButtonSmall
        : null;

  const uniformButtonTextAdaptiveStyle = isDesktop
    ? styles.webUniformButtonText
    : isTabletWeb
      ? styles.webUniformButtonTextTablet
      : isWeb
        ? styles.webUniformButtonTextSmall
        : null;

  const buttonIconAdaptiveStyle = isDesktop
    ? styles.webButtonIcon
    : isTabletWeb
      ? styles.webButtonIconTablet
      : isWeb
        ? styles.webButtonIconSmall
        : null;

  const uniformButtonIconSize = isDesktop ? 18 : isTabletWeb ? 18 : isWeb ? 18 : 16;
  const quickFilterIconSize = isDesktop ? 22 : isTabletWeb ? 22 : isWeb ? 20 : 18;

  const horizontalGutter = isDesktop ? 96 : isTabletWeb ? 48 : isWeb ? 16 : 16;
  const sharedSectionStyle = useMemo(() => {
    if (!isWeb) {
      return null;
    }

    return {
      width: '100%' as const,
      maxWidth: 1280,
      alignSelf: 'center' as const,
      paddingHorizontal: horizontalGutter,
    } satisfies ViewStyle;
  }, [isWeb, horizontalGutter]);

  // Мемоизированные стили для карточек в FlatList renderItem
  const cardWrapperStyle = useMemo(() => {
    if (!isWeb) {
      return compactView ? styles.nativeItemCompact : null;
    }

    if (compactView) {
      if (isDesktop) return { width: 230 };
      if (isTabletWeb) return { width: 240 };
      return { width: '48%' as const };
    } else {
      if (isDesktop) return { width: 360 };
      if (isTabletWeb) return { width: 380 };
      return { width: '100%' as const };
    }
  }, [isWeb, isDesktop, isTabletWeb, compactView]);

  // Мемоизированные стили для contentContainerStyle FlatList
  const listContentStyle = useMemo(() => {
    const baseStyles = [styles.listContent, { paddingTop: 8 }];

    if (!isWeb) {
      return baseStyles;
    }

    const webPadding = isDesktop
      ? { paddingHorizontal: 96, maxWidth: 1280, alignSelf: 'center' as const }
      : isTabletWeb
        ? { paddingHorizontal: 48, maxWidth: 1280, alignSelf: 'center' as const }
        : { paddingHorizontal: 12, maxWidth: 1280, alignSelf: 'center' as const };

    return [...baseStyles, styles.webListContainer, webPadding];
  }, [isWeb, isDesktop, isTabletWeb]);

  const sectionGapLarge = isWeb ? (isDesktop ? 14 : isTabletWeb ? 26 : 22) : 16;
  const sectionGapMedium = isWeb ? (isDesktop ? 10 : isTabletWeb ? 18 : 16) : 12;

  // Мемоизируем quickFilterOptions для предотвращения пересоздания на каждом рендере
  const quickFilterOptions = useMemo(() =>
    propertyType === 'rent'
      ? [
        {
          key: 'rent-apartment',
          category: 'apartment',
          renderIcon: (size: number, color: string) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
          label: t('property.rentApartment'),
        },
        {
          key: 'rent-house',
          category: 'house',
          renderIcon: (size: number, color: string) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          label: t('property.rentHouse'),
        },
        {
          key: 'rent-commercial',
          category: 'commercial',
          renderIcon: (size: number, color: string) => (
            <MaterialIcons name="storefront" size={size} color={color} />
          ),
          label: t('property.rentCommercial'),
        },
      ]
      : propertyType === 'sale'
        ? [
          {
            key: 'sale-apartment',
            category: 'apartment',
            renderIcon: (size: number, color: string) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
            label: t('property.saleApartment'),
          },
          {
            key: 'sale-house',
            category: 'house',
            renderIcon: (size: number, color: string) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
            label: t('property.saleHouse'),
          },
          {
            key: 'sale-commercial',
            category: 'commercial',
            renderIcon: (size: number, color: string) => (
              <MaterialIcons name="storefront" size={size} color={color} />
            ),
            label: t('property.saleCommercial'),
          },
          {
            key: 'sale-land',
            category: 'land',
            renderIcon: (size: number, color: string) => (
              <FontAwesome5 name="mountain" size={size} color={color} />
            ),
            label: t('filters.land'),
          },
        ]
        : []
  , [propertyType, t]);
  // брейкпоинты используются для вычисления колонок и ширин карточек

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.background },
      // На desktop web не добавляем общий паддинг, т.к. обёртки секций управляют отступами (96px)
      isWeb
        ? (isDesktop
          ? { paddingHorizontal: 0 }
          : isTabletWeb
            ? { paddingHorizontal: 24 }
            : { paddingHorizontal: 12 })
        : null,
    ]}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            isWeb ? styles.filterButtonWeb : null,
            { backgroundColor: theme.card, borderColor: theme.border },
            propertyType === 'all' && [styles.activeFilter, { backgroundColor: theme.primary }]
          ]}
          onPress={async () => {
            setPropertyType('all');
            // Сбрасываем активные фильтры при переключении на вкладку "Все"
            setActiveFilters({
              propertyTypes: [],
              price: [0, 3000],
              rooms: [],
              areas: [],
              features: []
            });
            setFiltersAppliedSale(false);
            setFiltersAppliedRent(false);
            // Очищаем typeItems, чтобы избежать показа старых данных из других вкладок
            setTypeItems([]);

            // Очищаем текущий список перед загрузкой, чтобы избежать показа неправильных данных
            setFilteredProperties([]);

            // Загружаем все объявления
            await refreshProperties();
            // Примечание: refreshProperties автоматически обновит filteredProperties через debounce
          }}
        >
          <Text style={[
            styles.filterText,
            isWeb ? styles.filterTextWeb : null,
            { color: theme.text },
            propertyType === 'all' && [styles.activeFilterText, { color: theme.headerText }]
          ]}>
            {t('common.all')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            isWeb ? styles.filterButtonWeb : null,
            { backgroundColor: theme.card, borderColor: theme.border },
            propertyType === 'sale' && [styles.activeFilter, { backgroundColor: theme.primary }]
          ]}
          onPress={async () => {
            setPropertyType('sale');
            setCategoryForType('sale', 'all');
            // Сбрасываем фильтры при переключении на вкладку "Продажа"
            const resetFilters = {
              propertyTypes: [],
              price: [0, 500000],
              rooms: [],
              areas: [],
              features: []
            };
            setSaleFilters(resetFilters);
            setActiveFilters(resetFilters);
            // Фильтры не считаются применёнными до явного действия пользователя
            setFiltersAppliedSale(false);

            // Получаем свойства по типу "sale" - это обновит activePropertyTypeRef
            try {
              const result = await getPropertiesByType('sale', 1, 30);
              if (result && result.data) {
                // Базовые данные по типу
                setTypeItems(result.data);
                // Применяем фильтр по городу, если выбран
                let list = [...result.data];
                if (selectedCity && selectedCity.id) {
                  const cityIdStr = String(selectedCity.id);
                  list = list.filter(p => {
                    if (!p || p.city_id === undefined || p.city_id === null) return false;
                    try { return String(p.city_id) === cityIdStr; } catch { return false; }
                  });
                }
                if (selectedDistrict && selectedDistrict.id) {
                  const districtIdStr = String(selectedDistrict.id);
                  list = list.filter((p) => {
                    try {
                      const propDistrictId = (p as any).district_id || (p as any).district?.id;
                      if (!propDistrictId) return false;
                      return String(propDistrictId) === districtIdStr;
                    } catch {
                      return false;
                    }
                  });
                }
                setFilteredProperties(list);
              }
            } catch (error) {
              Logger.error('Ошибка при загрузке объявлений для продажи:', error);
            }
          }}
        >
          <Text style={[
            styles.filterText,
            isWeb ? styles.filterTextWeb : null,
            { color: theme.text },
            propertyType === 'sale' && [styles.activeFilterText, { color: theme.headerText }]
          ]}>
            {t('common.sale')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            isWeb ? styles.filterButtonWeb : null,
            { backgroundColor: theme.card, borderColor: theme.border },
            propertyType === 'rent' && [styles.activeFilter, { backgroundColor: theme.primary }]
          ]}
          onPress={async () => {
            setPropertyType('rent');
            setCategoryForType('rent', 'all');
            // Сбрасываем фильтры при переключении на вкладку "Аренда"
            const resetFilters = {
              propertyTypes: [],
              price: [0, 3000],
              rooms: [],
              areas: [],
              features: []
            };
            setRentFilters(resetFilters);
            setActiveFilters(resetFilters);
            // Фильтры не считаются применёнными до явного действия пользователя
            setFiltersAppliedRent(false);

            // Получаем свойства по типу "rent" - это обновит activePropertyTypeRef
            try {
              const result = await getPropertiesByType('rent', 1, 30);
              if (result && result.data) {
                // Базовые данные по типу
                setTypeItems(result.data);
                // Применяем фильтр по городу, если выбран
                let list = [...result.data];
                if (selectedCity && selectedCity.id) {
                  const cityIdStr = String(selectedCity.id);
                  list = list.filter(p => {
                    if (!p || p.city_id === undefined || p.city_id === null) return false;
                    try { return String(p.city_id) === cityIdStr; } catch { return false; }
                  });
                }
                if (selectedDistrict && selectedDistrict.id) {
                  const districtIdStr = String(selectedDistrict.id);
                  list = list.filter((p) => {
                    try {
                      const propDistrictId = (p as any).district_id || (p as any).district?.id;
                      if (!propDistrictId) return false;
                      return String(propDistrictId) === districtIdStr;
                    } catch {
                      return false;
                    }
                  });
                }
                setFilteredProperties(list);
              }
            } catch (error) {
              Logger.error('Ошибка при загрузке объявлений для аренды:', error);
            }
          }}
        >
          <Text style={[
            styles.filterText,
            isWeb ? styles.filterTextWeb : null,
            { color: theme.text },
            propertyType === 'rent' && [styles.activeFilterText, { color: theme.headerText }]
          ]}>
            {t('common.rent')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            isWeb ? styles.filterButtonWeb : null,
            { backgroundColor: theme.card, borderColor: theme.border },
            propertyType === 'newBuildings' && [styles.activeFilter, { backgroundColor: theme.primary }]
          ]}
          onPress={async () => {
            setPropertyType('newBuildings');
            setCategoryForType('newBuildings', 'all');
            // Сбрасываем фильтры при переключении на вкладку "Новостройки"
            const resetFilters = {
              propertyTypes: [],
              price: [0, 500000],
              rooms: [],
              areas: [],
              features: []
            };
            setSaleFilters(resetFilters);
            setActiveFilters(resetFilters);
            setFiltersAppliedSale(false);

            try {
              const result = await getPropertiesByType('newBuildings', 1, 30);
              if (result && result.data) {
                setTypeItems(result.data);
                let list = [...result.data];
                if (selectedCity && selectedCity.id) {
                  const cityIdStr = String(selectedCity.id);
                  list = list.filter(p => {
                    if (!p || p.city_id === undefined || p.city_id === null) return false;
                    try { return String(p.city_id) === cityIdStr; } catch { return false; }
                  });
                }
                if (selectedDistrict && selectedDistrict.id) {
                  const districtIdStr = String(selectedDistrict.id);
                  list = list.filter((p) => {
                    try {
                      const propDistrictId = (p as any).district_id || (p as any).district?.id;
                      if (!propDistrictId) return false;
                      return String(propDistrictId) === districtIdStr;
                    } catch {
                      return false;
                    }
                  });
                }
                setFilteredProperties(list);
              }
            } catch (error) {
              Logger.error('Ошибка при загрузке объявлений для новостроек:', error);
            }
          }}
        >
          <Text style={[
            styles.filterText,
            isWeb ? styles.filterTextWeb : null,
            { color: theme.text },
            propertyType === 'newBuildings' && [styles.activeFilterText, { color: theme.headerText }]
          ]}>
            {t('common.newBuildings')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            isWeb ? styles.filterButtonWeb : null,
            { backgroundColor: theme.card, borderColor: theme.border },
            propertyType === 'agencies' && [styles.activeFilter, { backgroundColor: theme.primary }]
          ]}
          onPress={() => {
            setPropertyType('agencies');
          }}
        >
          <Text style={[
            styles.filterText,
            isWeb ? styles.filterTextWeb : null,
            { color: theme.text },
            propertyType === 'agencies' && [styles.activeFilterText, { color: theme.headerText }]
          ]}>
            {t('common.agencies', 'Агентства')}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedCity ? (
        <View
          style={[
            styles.districtRow,
            { backgroundColor: theme.background, borderColor: theme.border },
            sharedSectionStyle || undefined
          ]}
        >
          <TouchableOpacity
            style={[styles.districtButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleOpenDistrictModal}
            activeOpacity={0.9}
          >
            <Ionicons name="navigate-outline" size={16} color={theme.text} />
            <Text style={[styles.districtButtonText, { color: theme.text }]}>
              {selectedDistrict ? selectedDistrict.name : t('filters.allDistricts', 'Все районы')}
            </Text>
            {districtsLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={styles.districtLoader} />
            ) : (
              <Ionicons name="chevron-down" size={16} color={theme.secondary} />
            )}
          </TouchableOpacity>
          {selectedDistrict ? (
            <TouchableOpacity
              style={[styles.resetDistrictButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => handleSelectDistrict(null)}
              activeOpacity={0.9}
            >
              <Ionicons name="close-circle-outline" size={16} color={theme.secondary} />
              <Text style={[styles.resetDistrictText, { color: theme.secondary }]}>{t('filters.resetDistrict', 'Сбросить район')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showFilterActions && (
        <>
          {showQuickFilters && (
            <View
              style={[
                styles.categorySection,
                { backgroundColor: theme.background },
                sharedSectionStyle,
                isWeb ? { paddingHorizontal: horizontalGutter, marginBottom: sectionGapMedium } : null,
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[styles.categoryFilterContainer, { zIndex: 10 }]}
                contentContainerStyle={[
                  styles.categoryFilterContent,
                  isWeb
                    ? {
                      paddingHorizontal: isDesktop ? 8 : isTabletWeb ? 6 : 4,
                      paddingVertical: isDesktop ? 6 : undefined,
                      gap: isDesktop ? 16 : isTabletWeb ? 14 : 12,
                    }
                    : null,
                ]}
              >
                {quickFilterOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.propertyTypeCard,
                      { backgroundColor: theme.card, borderColor: theme.border },
                      propertyTypeCardAdaptiveStyle,
                      isWeb && { cursor: 'pointer' },
                      propertyCategory === option.category && styles.activeCard,
                    ]}
                    onPress={() => {
                      if (propertyType === 'rent' || propertyType === 'sale') {
                        handleCombinedFilter(propertyType, option.category);
                      }
                    }}
                  >
                    <View style={[
                      styles.iconContainer,
                      propertyTypeIconContainerStyle,
                      isWeb ? { backgroundColor: theme.primary + '15' } : null,
                    ]}>
                      {option.renderIcon(quickFilterIconSize, theme.primary)}
                    </View>
                    <Text style={[
                      styles.propertyTypeText,
                      { color: theme.text },
                      propertyTypeTextStyle,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View
            style={[
              sharedSectionStyle,
              isWeb ? { paddingHorizontal: horizontalGutter, marginBottom: sectionGapLarge } : null,
            ]}
          >
            <View style={[
              styles.filterRowContainer,
              isWeb ? { marginHorizontal: 0 } : null,
              filterRowAdaptiveStyle,
            ]}>
              <TouchableOpacity
                style={[
                  styles.uniformButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  uniformButtonAdaptiveStyle,
                  isWeb ? { cursor: 'pointer' } : null,
                ]}
                onPress={handleOpenFilterModal}
              >
                <Ionicons
                  name="filter-outline"
                  size={uniformButtonIconSize}
                  color={theme.primary}
                  style={[
                    styles.buttonIcon,
                    buttonIconAdaptiveStyle
                  ]}
                />
                <Text style={[
                  styles.uniformButtonText,
                  { color: theme.text },
                  uniformButtonTextAdaptiveStyle,
                ]}>
                  {t('common.filters')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uniformButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  uniformButtonAdaptiveStyle,
                  !areFiltersApplied() && styles.disabledButton,
                  isWeb ? { cursor: 'pointer' } : null,
                ]}
                onPress={handleClearFilters}
                disabled={!areFiltersApplied()}
              >
                <Ionicons
                  name="refresh-outline"
                  size={uniformButtonIconSize}
                  color={areFiltersApplied() ? theme.primary : theme.secondary}
                  style={[
                    styles.buttonIcon,
                    buttonIconAdaptiveStyle
                  ]}
                />
                <Text style={[
                  styles.uniformButtonText,
                  { color: areFiltersApplied() ? theme.text : theme.secondary },
                  uniformButtonTextAdaptiveStyle,
                ]}>
                  {t('common.reset')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uniformButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  uniformButtonAdaptiveStyle,
                  isWeb ? { cursor: 'pointer' } : null,
                ]}
                onPress={() => setCompactView(!compactView)}
              >
                <Ionicons
                  name={compactView ? "grid-outline" : "list-outline"}
                  size={uniformButtonIconSize}
                  color={theme.primary}
                  style={[
                    styles.buttonIcon,
                    buttonIconAdaptiveStyle
                  ]}
                />
                <Text style={[
                  styles.uniformButtonText,
                  { color: theme.text },
                  uniformButtonTextAdaptiveStyle,
                ]}>
                  {t('common.view')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uniformButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  uniformButtonAdaptiveStyle,
                  isWeb ? { cursor: 'pointer' } : null,
                ]}
                onPress={handleOpenMap}
              >
                <Ionicons
                  name="map-outline"
                  size={uniformButtonIconSize}
                  color={theme.primary}
                  style={[
                    styles.buttonIcon,
                    buttonIconAdaptiveStyle
                  ]}
                />
                <Text style={[
                  styles.uniformButtonText,
                  { color: theme.text },
                  uniformButtonTextAdaptiveStyle,
                ]}>
                  {t('common.map')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </>
      )}

      {!(isWeb && isDesktop) && (
        // Полноэкранная карта теперь открывается через кнопку "Карта"
        <View style={{ display: 'none' }} />
      )}

      {showQuickFilters && (() => {
        const filterModalType: DealTab = propertyType === 'sale' ? 'sale' : 'rent';
        return (
          <FilterModal
            visible={filterModalVisible}
            filters={tempFilters}
            onFiltersChange={handleTempFiltersChange}
            onClose={handleCloseFilterModal}
            onApply={handleApplyFilters}
            propertyType={filterModalType}
            darkMode={darkMode}
          />
        );
      })()}

      <Modal
        visible={districtModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.districtModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('filters.selectDistrict', 'Выберите район')}</Text>
              <TouchableOpacity onPress={() => setDistrictModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={[styles.districtItem, { borderColor: theme.border }]}
                onPress={() => handleSelectDistrict(null)}
              >
                <Text style={[styles.districtItemText, { color: theme.primary }]}>{t('filters.allDistricts', 'Все районы')}</Text>
              </TouchableOpacity>
              {districtsLoading ? (
                <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 12 }} />
              ) : districts.length === 0 ? (
                <Text style={{ color: theme.secondary, paddingVertical: 8 }}>{t('filters.noDistricts', 'В этом городе пока нет районов')}</Text>
              ) : (
                districts.map((district) => (
                  <TouchableOpacity
                    key={district.id}
                    style={[
                      styles.districtItem,
                      { borderColor: theme.border },
                      selectedDistrict?.id === district.id ? { backgroundColor: theme.primary + '22' } : null
                    ]}
                    onPress={() => handleSelectDistrict(district)}
                  >
                    <Text style={[styles.districtItemText, { color: theme.text }]}>{district.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {isAgencyView ? (
        agenciesLoading && agencies.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.secondary, marginTop: 12 }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : agenciesError && agencies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondary }]}>{agenciesError}</Text>
          </View>
        ) : agenciesForList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.text }]}>{t('agency.emptyList', 'Агентства пока не добавлены')}</Text>
          </View>
        ) : (
          <FlatList
            data={agenciesForList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.agencyCardWrapper,
                  isWeb
                    ? (isDesktop
                      ? styles.agencyCardWrapperDesktop
                      : isTabletWeb
                        ? styles.agencyCardWrapperTablet
                        : styles.agencyCardWrapperSmallWeb)
                    : styles.agencyCardWrapperNative
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.agencyCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isWeb ? { cursor: 'pointer' } : null,
                  ]}
                  onPress={() => navigation.navigate('Agency', { agencyId: item.id })}
                  activeOpacity={0.85}
                >
                  <View style={styles.agencyHeader}>
                    <View style={[styles.agencyLogoWrapper, { backgroundColor: theme.primary + '1A' }]}>
                      {item.logo_url ? (
                        <Image source={{ uri: item.logo_url }} style={styles.agencyLogoImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name="business-outline" size={22} color={theme.primary} />
                      )}
                    </View>
                    <View style={styles.agencyTitleBlock}>
                      <Text style={[styles.agencyName, { color: theme.text }]} numberOfLines={1}>
                        {item.name || t('agency.unnamed', 'Агентство')}
                      </Text>
                      {(item.city && item.city.length > 0 && item.city[0]?.name) || item.location ? (
                        <View style={styles.agencyMetaRow}>
                          <Ionicons name="location-outline" size={14} color={theme.secondary} />
                          <Text style={[styles.agencyMetaText, { color: theme.secondary }]} numberOfLines={1}>
                            {(item.city && item.city.length > 0 && item.city[0]?.name) || item.location}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {item.phone ? (
                    <View style={styles.agencyPhoneRow}>
                      <Ionicons name="call-outline" size={16} color={theme.primary} />
                      <Text style={[styles.agencyPhoneText, { color: theme.primary }]}>{item.phone}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={[
              styles.listContent,
              styles.agencyListContent,
              isWeb ? styles.webListContainer : null,
              isWeb
                ? (isDesktop
                  ? { paddingHorizontal: 96, maxWidth: 1280, alignSelf: 'center' }
                  : isTabletWeb
                    ? { paddingHorizontal: 48, maxWidth: 1280, alignSelf: 'center' }
                    : { paddingHorizontal: 12, maxWidth: 1280, alignSelf: 'center' })
                : { paddingHorizontal: 16 },
            ]}
            numColumns={agencyColumns}
            columnWrapperStyle={
              agencyColumns > 1
                ? (isWeb
                  ? styles.webColumnWrapperFull
                  : { gap: 8, justifyContent: 'flex-start' })
                : undefined
            }
            showsVerticalScrollIndicator={false}
          />
        )
      ) : loading || propertiesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondary, marginTop: 12 }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : filteredProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.text }]}>{t('property.noPropertiesFound')}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredProperties}
          onContentSizeChange={handleContentSizeChange}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={21}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          onScroll={(e) => {
            // Сохраняем позицию прокрутки
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            // Логируем позицию прокрутки каждые 500 пикселей
            if (Math.floor(scrollOffsetRef.current) % 500 === 0) {
              Logger.debug('Текущая позиция прокрутки:', Math.floor(scrollOffsetRef.current));
            }
          }}
          renderItem={({ item }: { item: Property }) => (
            <View
              style={[
                // Базовый центрирующий враппер (только для web)
                isWeb ? styles.webCardWrapper : null,
                // Мемоизированный стиль ширины карточки
                cardWrapperStyle,
              ]}
            >
              {compactView ? (
                <PropertyCardCompact
                  property={item}
                  onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
                  darkMode={darkMode}
                />
              ) : (
                <PropertyCard
                  property={item}
                  onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
                  darkMode={darkMode}
                />
              )}
            </View>
          )}
          contentContainerStyle={listContentStyle}
          showsVerticalScrollIndicator={false}
          // Колонки по аналогии со старым сайтом
          // compact: 5 (desktop) / 4 (tablet) / 2 (mobile web)
          // full:    3 (desktop) / 2 (tablet) / 1 (mobile web)
          numColumns={
            isWeb
              ? (compactView
                ? (isDesktop ? 5 : isTabletWeb ? 4 : 2)
                : (isDesktop ? 3 : isTabletWeb ? 2 : 1))
              : (compactView ? 2 : 1)
          }
          columnWrapperStyle={
            // ВАЖНО: на вебе columnWrapperStyle поддерживается только при numColumns > 1
            isWeb
              ? ((compactView
                ? (isDesktop ? 5 : isTabletWeb ? 4 : 2)
                : (isDesktop ? 3 : isTabletWeb ? 2 : 1)) > 1
                ? (compactView
                  ? (isDesktop || isTabletWeb
                    ? styles.webColumnWrapperCompact
                    : { paddingHorizontal: 12, justifyContent: 'space-between' })
                  : styles.webColumnWrapperFull)
                : undefined)
              : (compactView ? styles.nativeColumnWrapperCompact : undefined)
          }
          key={
            isWeb
              ? (compactView
                ? (isDesktop ? 'web-compact-5' : isTabletWeb ? 'web-compact-4' : 'web-compact-2')
                : (isDesktop ? 'web-full-3' : isTabletWeb ? 'web-full-2' : 'web-full-1'))
              : (compactView ? 'native-compact-2' : 'native-full-1')
          } // Ключ для пересоздания списка при смене режима/брейкпоинта
          onRefresh={async () => {
            // Если выбран определенный тип сделки, загружаем объявления именно этого типа
            if (propertyType === 'sale' || propertyType === 'rent' || propertyType === 'newBuildings') {
              try {
                const result = await getPropertiesByType(propertyType);
                if (result && result.data) {
                  // Не нужно вызывать setFilteredProperties, так как это сделает getPropertiesByType
                }
              } catch (error) {
                Logger.error(`Ошибка при обновлении объявлений типа ${propertyType}:`, error);
              }
            } else {
              // Если выбраны все объявления, используем стандартное обновление
              await refreshProperties();
            }
          }}
          refreshing={loading}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.text }]}>
                  {t('common.loadingMore')}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingTop: 10
  },
  categoryFilterContainer: {
    marginBottom: 4,
    zIndex: 10,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  propertyTypeCard: {
    width: 79,
    height: 72,
    borderRadius: 12,
    marginRight: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  activeCard: {
    borderColor: '#1E40AF',
    borderWidth: 2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  propertyTypeText: {
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'center',
    color: '#4B5563',
  },
  propertyTypeCardWeb: {
    width: 124,
    height: 96,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 12,
    borderRadius: 14,
    gap: 8,
  },
  propertyTypeCardTablet: {
    width: 132,
    height: 96,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 14,
    borderRadius: 14,
    gap: 8,
  },
  propertyTypeCardSmallWeb: {
    width: 110,
    height: 90,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 12,
    borderRadius: 14,
    gap: 6,
  },
  iconContainerWeb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },
  iconContainerTablet: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 8,
  },
  iconContainerSmallWeb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  propertyTypeTextWeb: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  propertyTypeTextTablet: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  propertyTypeTextSmallWeb: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
  },
  filterContainerWeb: {
    columnGap: 12,
    rowGap: 0,
  },
  filterButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 2,
    borderRadius: 40,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonWeb: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 48,
  },
  filterText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
  },
  filterTextWeb: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilter: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  activeFilterText: {
    color: 'white',
  },
  clearFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  disabledButton: {
    opacity: 0.5,
  },
  clearFilterIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    marginLeft: 2,
  },
  crossLine: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#1E40AF',
    transform: [{ rotate: '45deg' }],
    display: 'none', // Скрываем старую линию
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterButtonStandalone: {
    marginHorizontal: 16,
    marginBottom: 4, // Еще больше уменьшен отступ между блоками
    marginTop: 4, // Максимально компактный отступ
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  // Native (iOS/Android) compact grid helpers
  nativeColumnWrapperCompact: {
    paddingHorizontal: 8,
    columnGap: 8,
  },
  nativeItemCompact: {
    flex: 1,
  },
  // Web-only container to center and constrain content width
  webListContainer: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  // Wrapper for each card on web to prevent full-bleed stretching
  webCardWrapper: {
    width: 336,
    alignSelf: 'auto',
  },
  webCardWrapperCompact: {
    width: 300,
    alignSelf: 'auto',
  },
  // Обертка строк для компактной сетки (больше колонок, меньше зазоры)
  webColumnWrapperCompact: {
    gap: 16,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  // Обертка строк для полного вида (меньше колонок, больше дыхания)
  webColumnWrapperFull: {
    gap: 20,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  categorySection: {
    zIndex: 10,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    marginLeft: 8,
  },
  // Новые стили для строки фильтров
  filterRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    marginTop: 4,
    gap: 8, // Одинаковый отступ между кнопками
  },
  webFilterRowContainer: {
    gap: 12,
  },
  webFilterRowContainerTablet: {
    gap: 14,
  },
  webFilterRowContainerSmall: {
    gap: 12,
  },
  // Единый стиль для всех кнопок
  uniformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    flex: 1, // Все кнопки одинаковой ширины
    minHeight: 30,
  },
  uniformButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    marginLeft: 1,
    flexShrink: 1, // Позволяет тексту сжиматься
  },
  webUniformButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 46,
    borderRadius: 14,
  },
  webUniformButtonTablet: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 15,
  },
  webUniformButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 14,
  },
  webUniformButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  webUniformButtonTextTablet: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 7,
  },
  webUniformButtonTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 4,
  },
  webButtonIcon: {
    marginRight: 8,
  },
  webButtonIconTablet: {
    marginRight: 8,
  },
  webButtonIconSmall: {
    marginRight: 6,
  },
  agencyCardWrapper: {
    marginBottom: 2,
  },
  agencyCardWrapperDesktop: {
    width: 360,
  },
  agencyCardWrapperTablet: {
    width: 320,
  },
  agencyCardWrapperSmallWeb: {
    width: '100%',
  },
  agencyCardWrapperNative: {
    width: '100%',
    paddingHorizontal: 0,
  },
  agencyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    gap: 6,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  districtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  districtButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  districtLoader: {
    marginLeft: 6,
  },
  resetDistrictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  resetDistrictText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  districtModal: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  districtItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  districtItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  agencyLogoWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agencyLogoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  agencyTitleBlock: {
    flex: 1,
  },
  agencyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  agencyMeta: {
    fontSize: 13,
  },
  agencyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  agencyMetaText: {
    fontSize: 12,
    flexShrink: 1,
  },
  agencyPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  agencyPhoneText: {
    fontSize: 13,
    fontWeight: '500',
  },
  agencyListContent: {
    paddingVertical: 8,
    rowGap: 2,
  },
})

export default HomeScreen;
