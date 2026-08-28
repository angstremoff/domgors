'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Bed, Maximize, Bath } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Database } from '@shared/lib/database.types';
import { isFreshListing } from '@shared/utils/propertyRules';
import { cn } from '@/lib/utils/cn';

type Property = Database['public']['Tables']['properties']['Row'];

interface PropertyCardProps {
  property: Property & {
    city?: { name: string } | null;
    district?: { name: string } | null;
  };
  onFavoriteToggle?: (id: string) => void;
  isFavorite?: boolean;
}

export function PropertyCard({ property, onFavoriteToggle, isFavorite }: PropertyCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'sr-RS';
  const mainImage = property.images?.[0] || '/placeholder-property.jpg';
  const price = new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(property.price);
  const translatedCity = property.city?.name
    ? t(`cities.${property.city.name}`, { defaultValue: property.city.name })
    : '';
  const translatedDistrict = property.district?.name
    ? t(`districts.${property.district.name}`, { defaultValue: property.district.name })
    : '';
  const hasAreaValue = property.area !== null && property.area !== undefined;
  const hasRoomsValue =
    property.property_type !== 'land' &&
    property.rooms !== null &&
    property.rooms !== undefined;

  const detailsUrl = `/oglas/?id=${property.id}`;

  // Определяем тип недвижимости для отображения
  const getPropertyTypeLabel = () => {
    const typeMap: Record<string, string> = {
      'apartment': t('property.apartment'),
      'house': t('property.house'),
      'commercial': t('property.commercial'),
      'land': t('property.land'),
      'garage': t('property.garage'),
    };
    return typeMap[property.property_type || 'apartment'] || t('property.other');
  };

  // Бейдж «Новое» для свежих объявлений (до 7 дней)
  const isFresh = isFreshListing(property.created_at);

  return (
    <div className="group relative rounded-xl border border-border overflow-hidden bg-white dark:bg-surface hover:shadow-2xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 animate-card-enter">
      {/* Изображение */}
      <Link href={detailsUrl} className="block relative h-56 overflow-hidden">
        <Image
          src={mainImage}
          alt={property.title}
          fill
          className={`object-cover group-hover:scale-110 transition-transform duration-500 ${property.status !== 'active' ? 'grayscale' : ''}`}
        />
        {/* Градиент для лучшей читаемости */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Тип сделки (Продажа/Аренда) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className={`${property.type === 'sale' ? 'bg-blue-500' : 'bg-orange-500'} text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg`}>
            {property.type === 'sale' ? t('common.sale') : t('common.rent')}
          </div>
          {/* Статус */}
          {property.status !== 'active' && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {property.status === 'sold' ? t('property.status.sold') : t('property.status.rented')}
            </div>
          )}
        </div>

        {/* Новостройка + бейдж свежести (стек справа) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {property.is_new_building && (
            <div className="bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg">
              {t('common.newBuildings')}
            </div>
          )}
          {isFresh && (
            <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              {t('property.newBadge')}
            </div>
          )}
        </div>

        {/* Избранное */}
        {onFavoriteToggle && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavoriteToggle(property.id);
            }}
            className="absolute bottom-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur p-2.5 rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-lg"
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors',
                isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300'
              )}
            />
          </button>
        )}
      </Link>

      {/* Контент */}
      <Link href={detailsUrl} className="block p-5">
        {/* Тип и цена */}
        <div className="flex items-start justify-between mb-3">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
            {getPropertyTypeLabel()}
          </span>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{price}</div>
            {property.type === 'rent' && (
              <div className="text-xs text-textSecondary">/{t('property.month')}</div>
            )}
          </div>
        </div>

        {/* Заголовок */}
        <h3 className="text-lg font-semibold text-text mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {property.title}
        </h3>

        {/* Местоположение */}
        <div className="flex items-center gap-1.5 text-sm text-textSecondary mb-4">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {translatedCity}
            {translatedDistrict && `, ${translatedDistrict}`}
          </span>
        </div>

        {/* Характеристики */}
        <div className="flex items-center gap-4 text-sm text-textSecondary pt-4 border-t border-border">
          {hasAreaValue && (
            <div className="flex items-center gap-1.5">
              <Maximize className="h-4 w-4" />
              <span className="font-medium">{property.area} {t('property.sqm')}</span>
            </div>
          )}
          {hasRoomsValue && (
            <div className="flex items-center gap-1.5">
              <Bed className="h-4 w-4" />
              <span className="font-medium">{property.rooms} {t('property.rooms')}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
