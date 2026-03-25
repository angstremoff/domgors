'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, List, Map as MapIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PropertyGrid } from './PropertyGrid';
import { PropertyFilters, FilterState } from './PropertyFilters';
import { PropertyMap } from './PropertyMap';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import type { Database, TablesInsert } from '@shared/lib/database.types';
import {
  applyCityFilterChange,
  applyDistrictFilterChange,
  getSelectedCityIdFromFilters,
  sanitizePropertyListingFilters,
} from '@shared/utils/propertyListingFilters';
import {
  PROPERTY_LISTINGS_PAGE_SIZE,
  dedupePropertyListings,
  fetchPropertyListingsPage,
  mergePropertyListings,
  type PropertyListingFilters,
  type PropertyWithRelations,
} from '@/lib/property-listings';
type City = Database['public']['Tables']['cities']['Row'];
type District = Database['public']['Tables']['districts']['Row'];

interface PropertyListingsClientProps {
  type: 'sale' | 'rent';
  isNewBuilding?: boolean;
  initialProperties: PropertyWithRelations[];
}

export function PropertyListingsClient({
  type,
  isNewBuilding = false,
  initialProperties
}: PropertyListingsClientProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const initialListings = useMemo(
    () => dedupePropertyListings(initialProperties),
    [initialProperties]
  );
  const [properties, setProperties] = useState<PropertyWithRelations[]>(initialListings);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialListings.length === PROPERTY_LISTINGS_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<FilterState>(sanitizePropertyListingFilters({}));
  const [page, setPage] = useState(initialListings.length > 0 ? 1 : 0);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [initialRefreshComplete, setInitialRefreshComplete] = useState(false);
  const resetInFlightRef = useRef(false);
  const resetRequestIdRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);

  // Быстрые фильтры
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const selectedCity = useMemo(() => getSelectedCityIdFromFilters(filters), [filters]);
  const selectedDistrict = filters.districtId || undefined;

  const selectedDistrictData = useMemo(
    () => districts.find((district) => district.id === selectedDistrict),
    [districts, selectedDistrict]
  );

  const mapCenter = useMemo(() => {
    if (selectedDistrictData?.latitude && selectedDistrictData?.longitude) {
      const lat = parseFloat(String(selectedDistrictData.latitude));
      const lng = parseFloat(String(selectedDistrictData.longitude));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng] as [number, number];
      }
    }
    return undefined;
  }, [selectedDistrictData]);

  const mapZoom = selectedDistrictData ? 14 : undefined;

  useEffect(() => {
    fetchCities();
  }, []);

  // Загрузка избранного для текущего пользователя
  useEffect(() => {
    const supabase = createClient();
    const loadFavorites = async () => {
      if (!user) {
        setFavorites([]);
        return;
      }
      const { data, error: favError } = await supabase
        .from('favorites')
        .select('property_id')
        .eq('user_id', user.id);
      if (!favError) {
        const favoriteList = (data ?? []) as { property_id: string }[];
        setFavorites(favoriteList.map((f) => f.property_id));
      }
    };
    loadFavorites();
  }, [user]);

  const fetchCities = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('cities')
      .select('*')
      .order('name');
    if (data) setCities(data);
  };

  const fetchDistricts = useCallback(async (cityId: number) => {
    setDistrictsLoading(true);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('districts')
      .select('id, name, city_id, is_active, sort_order, latitude, longitude')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');

    if (fetchError) {
      setDistricts([]);
    } else {
      setDistricts(data || []);
    }
    setDistrictsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedCity !== undefined) {
      setDistricts([]);
      void fetchDistricts(selectedCity);
    } else {
      setDistricts([]);
    }
  }, [fetchDistricts, selectedCity]);

  const buildListingFilters = useCallback(
    (filterState: FilterState): PropertyListingFilters => {
      return {
        cityId:
          filterState.cityId !== undefined && filterState.cityId !== ''
            ? Number(filterState.cityId)
            : undefined,
        districtId: filterState.districtId || undefined,
        propertyType: filterState.propertyType,
        minPrice: filterState.minPrice,
        maxPrice: filterState.maxPrice,
        minArea: filterState.minArea,
        maxArea: filterState.maxArea,
        rooms: filterState.rooms,
      };
    },
    []
  );

  const refreshProperties = useCallback(
    async (filterState: FilterState, options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      const requestId = ++resetRequestIdRef.current;

      resetInFlightRef.current = true;
      setError(null);

      if (!silent) {
        setLoading(true);
      }

      const supabase = createClient();

      try {
        const fetched = await fetchPropertyListingsPage(supabase, {
          ...buildListingFilters(filterState),
          type,
          isNewBuilding,
          page: 0,
          pageSize: PROPERTY_LISTINGS_PAGE_SIZE,
        });

        if (requestId !== resetRequestIdRef.current) {
          return;
        }

        setProperties(fetched);
        setPage(fetched.length > 0 ? 1 : 0);
        setHasMore(fetched.length === PROPERTY_LISTINGS_PAGE_SIZE);
      } catch (refreshError) {
        if (requestId !== resetRequestIdRef.current) {
          return;
        }

        const message =
          refreshError instanceof Error ? refreshError.message : t('common.errorLoadingData');

        setError(message);

        if (!silent) {
          setProperties([]);
          setPage(0);
          setHasMore(false);
        }
      } finally {
        if (requestId === resetRequestIdRef.current) {
          resetInFlightRef.current = false;
          setLoading(false);
        }
      }
    },
    [buildListingFilters, isNewBuilding, t, type]
  );

  const loadMoreProperties = useCallback(async () => {
    if (resetInFlightRef.current || loadMoreInFlightRef.current || loading || loadingMore || !hasMore) {
      return;
    }

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    setError(null);

    const currentPage = page;
    const supabase = createClient();

    try {
      const fetched = await fetchPropertyListingsPage(supabase, {
        ...buildListingFilters(filters),
        type,
        isNewBuilding,
        page: currentPage,
        pageSize: PROPERTY_LISTINGS_PAGE_SIZE,
      });

      setProperties((prev) => mergePropertyListings(prev, fetched));
      setPage(currentPage + 1);
      setHasMore(fetched.length === PROPERTY_LISTINGS_PAGE_SIZE);
    } catch (loadMoreError) {
      const message =
        loadMoreError instanceof Error ? loadMoreError.message : t('common.errorLoadingData');

      setError(message);
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [buildListingFilters, filters, hasMore, isNewBuilding, loading, loadingMore, page, t, type]);

  const handleFilterChange = (newFilters: FilterState) => {
    const nextFilters = sanitizePropertyListingFilters(newFilters);
    setFilters(nextFilters);
    void refreshProperties(nextFilters);
  };

  const handleCityChange = (cityId: string) => {
    const nextFilters = applyCityFilterChange(filters, cityId);

    setFilters(nextFilters);
    void refreshProperties(nextFilters);
  };

  const handleDistrictChange = (districtId: string) => {
    const nextFilters = applyDistrictFilterChange(filters, districtId);

    setFilters(nextFilters);
    void refreshProperties(nextFilters);
  };

  const handleFavoriteToggle = async (id: string) => {
    if (!user) {
      alert(t('common.loginRequired'));
      return;
    }
    const supabase = createClient();
    const isFav = favorites.includes(id);
    // оптимистичное обновление
    setFavorites((prev) =>
      isFav ? prev.filter((fav) => fav !== id) : [...prev, id]
    );

    if (isFav) {
      await supabase.from('favorites').delete().eq('property_id', id).eq('user_id', user.id);
    } else {
      const newFav: TablesInsert<'favorites'> = { property_id: id, user_id: user.id };
      await supabase.from('favorites').insert([newFav] as any);
    }
  };

  useEffect(() => {
    if (viewMode !== 'list' || !initialRefreshComplete || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMoreProperties();
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );

    const el = loaderRef.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, initialRefreshComplete, loadMoreProperties, viewMode]);

  // Инициализационная загрузка
  useEffect(() => {
    void refreshProperties(filters, { silent: initialListings.length > 0 }).finally(() => {
      setInitialRefreshComplete(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTitle = () => {
    if (isNewBuilding) return t('common.newBuildings');
    return type === 'sale' ? t('common.sale') : t('common.rent');
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Заголовок и управление */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text mb-4">{getTitle()}</h1>

        {/* Панель быстрых фильтров */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Выбор города */}
            <select
              value={selectedCity !== undefined ? String(selectedCity) : ''}
              onChange={(e) => handleCityChange(e.target.value)}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('common.allCities')}</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id.toString()}>
                  {t(`cities.${city.name}`, { defaultValue: city.name })}
                </option>
              ))}
            </select>

            {selectedCity !== undefined && (
              <select
                value={selectedDistrict || ''}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="px-4 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={districtsLoading || districts.length === 0}
              >
                <option value="">{t('filters.allDistricts')}</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {t(`districts.${district.name}`, { defaultValue: district.name })}
                  </option>
                ))}
              </select>
            )}

            {/* Кнопка фильтров */}
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t('common.filters')}
            </Button>
          </div>

          {/* Переключатель вида */}
          <div className="flex gap-2 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${viewMode === 'list'
                ? 'bg-primary text-white'
                : 'text-textSecondary hover:text-text'
                }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.view')}</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${viewMode === 'map'
                ? 'bg-primary text-white'
                : 'text-textSecondary hover:text-text'
                }`}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.map')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Боковая панель фильтров */}
        {showFilters && (
          <aside className="lg:w-80 flex-shrink-0">
            <PropertyFilters
              onFilterChange={handleFilterChange}
              value={filters}
              cityId={selectedCity}
              districts={districts}
              districtsLoading={districtsLoading}
            />
          </aside>
        )}

        {/* Основной контент */}
        <div className="flex-1">
          {viewMode === 'list' ? (
            <>
              {loading && properties.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <PropertyGrid
                  properties={properties}
                  loading={loading && properties.length === 0}
                  error={error}
                  onFavoriteToggle={handleFavoriteToggle}
                  favorites={favorites}
                />
              )}
            </>
          ) : (
            <PropertyMap properties={properties} center={mapCenter} zoom={mapZoom} />
          )}
          {viewMode === 'list' && hasMore && (
            <div ref={loaderRef} className="w-full h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="inline-block w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
