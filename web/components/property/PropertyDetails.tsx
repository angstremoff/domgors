'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Map, MapPin, Bed, Maximize, Phone, Share2, Heart, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { PropertyGallery } from './PropertyGallery';
import { PropertyLocationMap } from './PropertyLocationMap';
import type { Database } from '@shared/lib/database.types';
import { parseMapCoordinates } from '@shared/utils/mapCoordinates';

type Property = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
  user?: { name: string; phone: string } | null;
};

interface PropertyDetailsProps {
  property: Property;
  agencyId?: string | null;
}

export function PropertyDetails({ property, agencyId }: PropertyDetailsProps) {
  const { t } = useTranslation();
  const propertyCoordinates = parseMapCoordinates(property.coordinates);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [agencyData, setAgencyData] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);

  const isAgency = (property.user as { is_agency?: boolean } | null)?.is_agency === true;

  useEffect(() => {
    if (!agencyId) return;
    const supabase = createClient();
    supabase
      .from('agency_profiles')
      .select('id, name, logo_url')
      .eq('id', agencyId)
      .single()
      .then(({ data }) => {
        if (data) setAgencyData(data);
      });
  }, [agencyId]);

  const price = new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(property.price);
  const translatedCity = property.city?.name
    ? t(`cities.${property.city.name}`, { defaultValue: property.city.name })
    : property.city?.name || property.location;
  const translatedDistrict = property.district?.name
    ? t(`districts.${property.district.name}`, { defaultValue: property.district.name })
    : '';
  const hasAreaValue = property.area !== null && property.area !== undefined;
  const hasRoomsValue =
    property.property_type !== 'land' &&
    property.rooms !== null &&
    property.rooms !== undefined;

  const getPropertyTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'apartment': t('property.apartment'),
      'house': t('property.house'),
      'commercial': t('property.commercial'),
      'land': t('property.land'),
      'garage': t('property.garage'),
      'other': t('property.other')
    };
    return typeMap[type] || type;
  };

  const getFeatureLabel = (feature: string) => {
    return t(`features.${feature}`, { defaultValue: feature });
  };

  const handleShare = async () => {
    // Используем property.html обработчик deep links - как в мобильном приложении
    // Он проверяет платформу, наличие приложения и предлагает установить или открыть на сайте
    const deeplinkHandlerUrl = `https://domgo.rs/property.html?id=${property.id}`;

    // Получаем переведённое название города
    const cityName = property.city?.name || '';
    const translatedCityName = cityName ? t(`cities.${cityName}`, { defaultValue: cityName }) : '';

    // Формируем текст для шаринга
    const priceText = new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(property.price);

    const shareText = `${property.title}\n${priceText}\n${translatedCityName}\n\n${t('property.moreDetailsInApp', 'Подробнее в приложении DomGo')}: ${deeplinkHandlerUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text: shareText,
          url: deeplinkHandlerUrl,
        });
      } else {
        // Fallback: копируем в буфер обмена
        await navigator.clipboard.writeText(shareText);
        alert(t('common.linkCopied', 'Ссылка скопирована в буфер обмена'));
      }
    } catch (error) {
      console.error('Ошибка при шаринге:', error);
    }
  };

  const handleScrollToMap = () => {
    const mapSection = document.getElementById('property-location-map');
    if (!mapSection) {
      return;
    }

    mapSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="space-y-8">
      {/* Галерея изображений */}
      <PropertyGallery images={property.images || []} status={property.status || 'active'} />

      {/* Основная информация */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Левая колонка - описание */}
        <div className="lg:col-span-2 space-y-6">
          {/* Заголовок и цена */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold text-text">{property.title}</h1>
              <Button variant="ghost" size="sm">
                <Heart className="h-5 w-5" />
              </Button>
            </div>
            <div className="mb-4 flex items-center text-textSecondary">
              <MapPin className="h-5 w-5 mr-2" />
              <span>
                {translatedDistrict && `${translatedDistrict}, `}
                {translatedCity}
              </span>
              {propertyCoordinates ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleScrollToMap}
                  className="ml-1 h-8 w-8 shrink-0 p-0 text-primary hover:bg-primary/10"
                  aria-label={t('property.viewOnMap')}
                  title={t('property.viewOnMap')}
                >
                  <Map className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <p className="text-4xl font-bold text-primary">{price}</p>
          </div>

          {/* Характеристики */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {hasRoomsValue && (
              <div className="text-center p-4 bg-surface rounded-lg">
                <Bed className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm text-textSecondary">{t('property.rooms')}</p>
                <p className="text-lg font-semibold text-text">{property.rooms}</p>
              </div>
            )}
            {hasAreaValue && (
              <div className="text-center p-4 bg-surface rounded-lg">
                <Maximize className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm text-textSecondary">{t('property.area')}</p>
                <p className="text-lg font-semibold text-text">{property.area} {t('property.sqm')}</p>
              </div>
            )}
            {property.property_type && (
              <div className="text-center p-4 bg-surface rounded-lg">
                <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm text-textSecondary">{t('property.propertyType')}</p>
                <p className="text-lg font-semibold text-text">
                  {getPropertyTypeLabel(property.property_type)}
                </p>
              </div>
            )}
            {property.is_new_building && (
              <div className="text-center p-4 bg-surface rounded-lg">
                <p className="text-sm text-textSecondary">{t('common.newBuildings')}</p>
                <p className="text-lg font-semibold text-success">{t('common.yes')}</p>
              </div>
            )}
          </div>

          {/* Описание */}
          {property.description && (
            <div>
              <h2 className="text-2xl font-semibold text-text mb-4">{t('property.description')}</h2>
              <p className="text-textSecondary whitespace-pre-wrap">{property.description}</p>
            </div>
          )}

          {/* Особенности */}
          {property.features && property.features.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-text mb-4">{t('property.features')}</h2>
              <ul className="grid grid-cols-2 gap-2">
                {property.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-textSecondary">
                    <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                    {getFeatureLabel(feature)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {propertyCoordinates ? (
            <div id="property-location-map" className="scroll-mt-24">
              <div className="mb-4 flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-text">{t('property.locationOnMap')}</h2>
                <p className="text-sm text-textSecondary">
                  {property.location}
                  {translatedDistrict || translatedCity
                    ? `, ${[translatedDistrict, translatedCity].filter(Boolean).join(', ')}`
                    : ''}
                </p>
              </div>
              <PropertyLocationMap property={property} />
            </div>
          ) : null}
        </div>

        {/* Правая колонка - контакты */}
        <div className="space-y-4">
          <div className="sticky top-20 bg-surface border border-border rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold text-text">{t('property.contact')}</h3>

            {property.user?.name && (
              <div>
                <p className="text-sm text-textSecondary mb-1">
                  {isAgency ? t('property.agency', 'Agencija') : t('property.owner')}
                </p>
                {isAgency && agencyData ? (
                  <Link
                    href={`/agencija?id=${agencyData.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                  >
                    {agencyData.name}
                  </Link>
                ) : (
                  <p className="text-lg font-medium text-text">{property.user.name}</p>
                )}
              </div>
            )}

            {property.user?.phone ? (
              <div className="space-y-3">
                {!phoneRevealed ? (
                  <Button onClick={() => setPhoneRevealed(true)} className="w-full" size="lg">
                    <Phone className="h-5 w-5 mr-2" />
                    {t('property.showPhone')}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="mb-2 text-sm text-textSecondary">{t('property.phone')}</p>
                    <a
                      href={`tel:${property.user.phone}`}
                      className="block text-xl font-semibold text-primary break-all hover:underline"
                    >
                      {property.user.phone}
                    </a>
                    <p className="mt-2 text-xs text-textSecondary">
                      {t('property.phoneRevealHint')}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <Button onClick={handleShare} variant="outline" className="w-full" size="lg">
              <Share2 className="h-5 w-5 mr-2" />
              {t('common.share')}
            </Button>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-textSecondary">
                ID: {property.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
