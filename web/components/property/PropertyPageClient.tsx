'use client';

import { useEffect } from 'react';
import { PropertyDetails } from '@/components/property/PropertyDetails';
import { useTranslation } from 'react-i18next';
import {
  generatePropertyDescription,
  generatePropertyTitle,
  getPropertyOfferAvailability,
  getPropertyStructuredDataType,
} from '@/lib/seo-utils';
import { DEFAULT_SITE_URL, setCanonicalLink, upsertJsonLd, upsertMetaTag } from '@/lib/seo-head';
import type { PropertyPageProperty } from '@/lib/seo-page-data';

interface PropertyPageClientProps {
  property: PropertyPageProperty;
}

export function PropertyPageClient({ property }: PropertyPageClientProps) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'sr';
    const title = generatePropertyTitle(property, lang);
    const description = generatePropertyDescription(property, lang);
    const image = property.images && property.images.length > 0
      ? property.images[0]
      : `${DEFAULT_SITE_URL}/placeholder-property.jpg`;
    const url = `${DEFAULT_SITE_URL}/oglas?id=${property.id}`;

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
  }, [property, i18n.language]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PropertyDetails property={property} agencyId={property.agency_id} />
    </div>
  );
}
