'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, MapPin, List, Map as MapIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PropertyGrid } from './PropertyGrid';
import { PropertyFilters, FilterState } from './PropertyFilters';
import { PropertyMap } from './PropertyMap';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import type { Database, TablesInsert } from '@shared/lib/database.types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type PropertyWithRelations = PropertyRow & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};
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
  const PAGE_SIZE = 50;
  const [properties, setProperties] = useState<PropertyWithRelations[]>(initialProperties);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialProperties.length === PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(initialProperties.length > 0 ? 1 : 0);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Быстрые фильтры
  const [selectedCity, setSelectedCity] = useState<number | undefined>();
  const [cities, setCities] = useState<City[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>();
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

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
      fetchDistricts(selectedCity);
      setSelectedDistrict(undefined);
      setFilters((prev) => ({ ...prev, cityId: String(selectedCity), districtId: undefined }));
    } else {
      setDistricts([]);
      setSelectedDistrict(undefined);
      setFilters((prev) => ({ ...prev, cityId: undefined, districtId: undefined }));
    }
  }, [fetchDistricts, selectedCity]);

  const fetchProperties = useCallback(
    async (options: { reset?: boolean; filters?: FilterState; silent?: boolean } = {}) => {
      const { reset = false, filters: overrideFilters, silent = false } = options;
      const filterState = overrideFilters ?? filters;
      if (loading || loadingMore) {
        if (!reset) {
          return;
        }
      }

      if (reset) {
        if (!silent) {
          setLoading(true);
        }
        setPage(0);
        setHasMore(true);
      } else {
        if (!hasMore) return;
        setLoadingMore(true);
      }

      setError(null);
      const supabase = createClient();

      const districtFilter = filterState.districtId ?? selectedDistrict;
      const cityFilter =
        filterState.cityId !== undefined && filterState.cityId !== ''
          ? Number(filterState.cityId)
          : selectedCity;

      let query = supabase
        .from('properties')
        .select(`
          *,
          city:cities(name),
          district:districts(name)
        `)
        .eq('type', type);

      if (isNewBuilding) {
        query = query.eq('is_new_building', true);
      }

      // Применяем фильтры
      if (cityFilter !== undefined) {
        query = query.eq('city_id', cityFilter);
      }

      if (districtFilter) {
        query = query.eq('district_id', districtFilter);
      }

      if (filterState.propertyType) {
        query = query.eq('property_type', filterState.propertyType);
      }

      if (filterState.minPrice) {
        query = query.gte('price', filterState.minPrice);
      }

      if (filterState.maxPrice) {
        query = query.lte('price', filterState.maxPrice);
      }

      if (filterState.minArea) {
        query = query.gte('area', filterState.minArea);
      }

      if (filterState.maxArea) {
        query = query.lte('area', filterState.maxArea);
      }

      if (filterState.rooms && filterState.propertyType !== 'land') {
        query = query.eq('rooms', filterState.rooms);
      }

      const currentPage = reset ? 0 : page;
      const rangeFrom = currentPage * PAGE_SIZE;
      const rangeTo = rangeFrom + PAGE_SIZE - 1;

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (fetchError) {
        setError(fetchError.message);
        if (reset && !silent) {
          setProperties([]);
        }
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const fetched = (data as PropertyWithRelations[]) || [];
      setHasMore(fetched.length === PAGE_SIZE);

      if (reset) {
        setProperties(fetched);
        setPage(1);
        setLoading(false);
      } else {
        setProperties((prev) => [...prev, ...fetched]);
        setPage((prev) => prev + 1);
        setLoadingMore(false);
      }
    },
    [filters, hasMore, isNewBuilding, loading, loadingMore, page, selectedCity, selectedDistrict, type]
  );

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setSelectedDistrict(newFilters.districtId || undefined);
    fetchProperties({ reset: true, filters: newFilters });
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId ? Number(cityId) : undefined);
    setSelectedDistrict(undefined);
    setPage(0);
    setHasMore(true);
    fetchProperties({ reset: true, filters: { ...filters, cityId: cityId || undefined, districtId: undefined } });
  };

  const handleDistrictChange = (districtId: string) => {
    const value = districtId || undefined;
    setSelectedDistrict(value);
    setFilters((prev) => ({ ...prev, districtId: value }));
    fetchProperties({ reset: true, filters: { ...filters, districtId: value } });
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
    if (viewMode !== 'list') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchProperties({ reset: false });
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
  }, [fetchProperties, viewMode]);

  // Инициализационная загрузка
  useEffect(() => {
    fetchProperties({ reset: true, filters, silent: initialProperties.length > 0 });
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
              cityId={selectedCity}
              districts={districts}
              districtsLoading={districtsLoading}
              selectedDistrictId={selectedDistrict}
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
