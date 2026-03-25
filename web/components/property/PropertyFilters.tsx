'use client';

import { useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import type { Database } from '@shared/lib/database.types';
import {
  applyDistrictFilterChange,
  applyPropertyTypeFilterChange,
  parsePropertyListingNumberInput,
  resetPropertyListingFilters,
  sanitizePropertyListingFilters,
  type PropertyListingFilterState,
} from '@shared/utils/propertyListingFilters';

interface PropertyFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  value: FilterState;
  cityId?: number;
  districts?: District[];
  districtsLoading?: boolean;
}

export type FilterState = PropertyListingFilterState;

type District = Database['public']['Tables']['districts']['Row'];

export function PropertyFilters({
  onFilterChange,
  value,
  cityId,
  districts = [],
  districtsLoading,
}: PropertyFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(sanitizePropertyListingFilters(value));
  const { t } = useTranslation();
  const isLandSelected = filters.propertyType === 'land';

  const propertyTypes = [
    { value: 'apartment', label: t('property.apartment') },
    { value: 'house', label: t('property.house') },
    { value: 'commercial', label: t('property.commercial') },
    { value: 'land', label: t('property.land') },
  ];

  const handleApplyFilters = () => {
    onFilterChange(sanitizePropertyListingFilters(filters));
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters = resetPropertyListingFilters();
    setFilters(resetFilters);
    onFilterChange(resetFilters);
    setIsOpen(false);
  };

  useEffect(() => {
    setFilters(sanitizePropertyListingFilters(value));
  }, [value]);

  useEffect(() => {
    if (!isLandSelected) {
      return;
    }

    setFilters((prev) => {
      if (prev.rooms === undefined) {
        return prev;
      }

      return {
        ...prev,
        rooms: undefined,
      };
    });
  }, [isLandSelected]);

  return (
    <div className="relative">
      {/* Mobile filter button */}
      <Button
        variant="outline"
        className="md:hidden w-full mb-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter className="h-5 w-5 mr-2" />
        {t('common.filters')}
      </Button>

      {/* Filter panel */}
      <Card className={`${isOpen ? 'block' : 'hidden md:block'} p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters.title')}
          </h3>
          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden text-textSecondary hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              {t('filters.propertyType')}
            </label>
            <select
              className="w-full px-4 py-2 bg-surface border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
              value={filters.propertyType || ''}
              onChange={(e) => setFilters(applyPropertyTypeFilterChange(filters, e.target.value))}
            >
              <option value="">{t('common.allTypes')}</option>
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* District selector */}
          {cityId !== undefined && (
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                {t('filters.selectDistrict')}
              </label>
              {districtsLoading ? (
                <div className="text-sm text-textSecondary">{t('common.loading')}</div>
              ) : districts.length === 0 ? (
                <div className="text-sm text-textSecondary">{t('filters.noDistricts')}</div>
              ) : (
                <select
                  className="w-full px-4 py-2 bg-surface border border-border rounded-md text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  value={filters.districtId || ''}
                  onChange={(e) => setFilters(applyDistrictFilterChange(filters, e.target.value))}
                  disabled={districtsLoading}
                >
                  <option value="">{t('filters.allDistricts')}</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              {t('filters.price')} (€)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder={t('common.from')}
                value={filters.minPrice ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minPrice: parsePropertyListingNumberInput(e.target.value),
                  })
                }
              />
              <Input
                type="number"
                placeholder={t('common.to')}
                value={filters.maxPrice ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxPrice: parsePropertyListingNumberInput(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Area Range */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              {t('filters.area')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder={t('common.from')}
                value={filters.minArea ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minArea: parsePropertyListingNumberInput(e.target.value),
                  })
                }
              />
              <Input
                type="number"
                placeholder={t('common.to')}
                value={filters.maxArea ?? ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxArea: parsePropertyListingNumberInput(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Rooms */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              {t('filters.rooms')}
            </label>
            {isLandSelected ? (
              <div className="text-sm text-textSecondary">
                {t('filters.roomsNotApplicable', 'Для участков фильтр по комнатам не применяется')}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        rooms: filters.rooms === num ? undefined : num,
                      })
                    }
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filters.rooms === num
                        ? 'bg-primary text-white'
                        : 'bg-surface text-text hover:bg-border'
                    }`}
                  >
                    {num === 5 ? t('filters.5plusRooms') : num}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleResetFilters} variant="outline" className="flex-1">
              {t('filters.resetFilters')}
            </Button>
            <Button onClick={handleApplyFilters} className="flex-1">
              {t('filters.applyFilters')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
