'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bed, Maximize } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Database } from '@shared/lib/database.types';
import { cn } from '@/lib/utils/cn';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type PropertyWithRelations = PropertyRow & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

interface PropertyCardCompactProps {
  property: PropertyWithRelations;
  className?: string;
}

export function PropertyCardCompact({ property, className }: PropertyCardCompactProps) {
  const { t } = useTranslation();
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

  const getPropertyTypeLabel = () => {
    const typeMap: Record<string, string> = {
      apartment: t('property.apartment'),
      house: t('property.house'),
      commercial: t('property.commercial'),
      land: t('property.land'),
      garage: t('property.garage'),
    };
    return typeMap[property.property_type || 'apartment'] || t('property.other');
  };

  return (
    <div
      className={cn(
        'group relative flex-shrink-0 snap-start w-72 sm:w-80 h-full rounded-xl border border-border overflow-hidden bg-white dark:bg-surface hover:shadow-xl transition-all duration-300 flex flex-col',
        className
      )}
    >
      <Link href={detailsUrl} className="block relative h-40 overflow-hidden">
        <Image
          src={mainImage}
          alt={property.title}
          fill
          className={cn(
            'object-cover group-hover:scale-110 transition-transform duration-500',
            property.status !== 'active' ? 'grayscale' : ''
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div
            className={cn(
              'text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg',
              property.type === 'sale' ? 'bg-blue-500' : 'bg-orange-500'
            )}
          >
            {property.type === 'sale' ? t('common.sale') : t('common.rent')}
          </div>
          {property.is_new_building && (
            <div className="bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg">
              {t('common.newBuildings')}
            </div>
          )}
        </div>
      </Link>

      <Link href={detailsUrl} className="block p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full whitespace-nowrap">
            {getPropertyTypeLabel()}
          </span>
          <div className="text-right leading-tight">
            <div className="text-lg font-bold text-primary">{price}</div>
            <div className="text-xs text-textSecondary h-4">
              <span className={cn(property.type === 'rent' ? '' : 'invisible')}>
                /{t('property.month')}
              </span>
            </div>
          </div>
        </div>

        <h3 className="text-base font-semibold text-text mb-2 line-clamp-2 min-h-[48px] group-hover:text-primary transition-colors">
          {property.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-textSecondary">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {translatedCity}
            {translatedDistrict && `, ${translatedDistrict}`}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-textSecondary mt-auto pt-3 border-t border-border min-h-[28px]">
          <div className={cn('flex items-center gap-1.5', hasAreaValue ? '' : 'invisible')}>
            <Maximize className="h-4 w-4" />
            <span className="font-medium">
              {property.area ?? 0} {t('property.sqm')}
            </span>
          </div>
          <div className={cn('flex items-center gap-1.5', hasRoomsValue ? '' : 'invisible')}>
            <Bed className="h-4 w-4" />
            <span className="font-medium">
              {property.rooms ?? 0} {t('property.rooms')}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
