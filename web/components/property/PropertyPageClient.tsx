'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PropertyDetails } from '@/components/property/PropertyDetails';
import { useTranslation } from 'react-i18next';
import {
  generatePropertyDescription,
  generatePropertyTitle,
  getPropertyOfferAvailability,
  getPropertyStructuredDataType,
} from '@/lib/seo-utils';
import { DEFAULT_SITE_URL, setCanonicalLink, upsertJsonLd, upsertMetaTag } from '@/lib/seo-head';
import type { Database } from '@shared/lib/database.types';

type Property = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
  user?: { name: string; phone: string; is_agency?: boolean } | null;
};

export function PropertyPageClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t, i18n } = useTranslation();
  const supabase = createClient();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError(true);
      return;
    }

    const loadProperty = async () => {
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select(`
          *,
          user:users(name, phone, is_agency),
          city:cities(name),
          district:districts(name),
          agency_profile:agency_profiles(id, name, logo_url)
        `)
        .eq('id', id)
        .single();

      if (fetchError || !data) {
        setError(true);
      } else {
        setProperty(data as Property);
      }
      setLoading(false);
    };

    loadProperty();
  }, [id, supabase]);

  useEffect(() => {
    if (!property || !id) {
      return;
    }

    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'sr';
    const title = generatePropertyTitle(property, lang);
    const description = generatePropertyDescription(property, lang);
    const image = property.images && property.images.length > 0
      ? property.images[0]
      : `${DEFAULT_SITE_URL}/placeholder-property.jpg`;
    const url = `${DEFAULT_SITE_URL}/oglas/?id=${id}`;

    document.title = title;
    upsertMetaTag('description', description);
    upsertMetaTag('og:title', title, 'property');
    upsertMetaTag('og:description', description, 'property');
    upsertMetaTag('og:type', 'product', 'property');
    upsertMetaTag('og:url', url, 'property');
    upsertMetaTag('og:image', image, 'property');
    upsertMetaTag('twitter:card', 'summary_large_image');
    upsertMetaTag('twitter:title', title);
    upsertMetaTag('twitter:description', description);
    upsertMetaTag('twitter:image', image);
    setCanonicalLink(url);

    const itemOffered: Record<string, unknown> = {
      '@type': getPropertyStructuredDataType(property.property_type),
      name: property.title,
      image: property.images && property.images.length > 0 ? property.images : undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.city?.name,
        addressRegion: property.district?.name || property.city?.name,
        addressCountry: 'RS',
      },
    };

    if (property.area) {
      itemOffered.floorSize = {
        '@type': 'QuantitativeValue',
        value: property.area,
        unitText: 'M2',
      };
    }

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Offer',
      url,
      description,
      priceCurrency: 'EUR',
      availability: getPropertyOfferAvailability(property.status),
      itemOffered,
    };

    if (property.price) {
      jsonLd.price = property.price;
    }

    upsertJsonLd('ld-json-property', jsonLd);
  }, [property, id, i18n.language]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text mb-4">{t('common.notFound')}</h1>
        <p className="text-textSecondary">{t('property.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PropertyDetails property={property} agencyId={property.agency_id} />
    </div>
  );
}
