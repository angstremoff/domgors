'use client';

import { useEffect } from 'react';
import { AgencyDetails } from '@/components/agency/AgencyDetails';
import { useTranslation } from 'react-i18next';
import { generateAgencyDescription, generateAgencyTitle } from '@/lib/seo-utils';
import { DEFAULT_SITE_URL, setCanonicalLink, upsertJsonLd, upsertMetaTag } from '@/lib/seo-head';
import type { AgencyPageAgency, AgencyPageProperty } from '@/lib/seo-page-data';

interface AgencyPageClientProps {
  agency: AgencyPageAgency;
  properties: AgencyPageProperty[];
}

export function AgencyPageClient({ agency, properties }: AgencyPageClientProps) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'sr';
    const title = generateAgencyTitle(agency, lang);
    const description = generateAgencyDescription(agency, lang);
    const image = agency.logo_url || `${DEFAULT_SITE_URL}/logo.png`;
    const url = `${DEFAULT_SITE_URL}/agencija?id=${agency.id}`;

    document.title = title;
    upsertMetaTag('description', description);
    upsertMetaTag('og:title', title, 'property');
    upsertMetaTag('og:description', description, 'property');
    upsertMetaTag('og:type', 'profile', 'property');
    upsertMetaTag('og:url', url, 'property');
    upsertMetaTag('og:image', image, 'property');
    upsertMetaTag('twitter:card', 'summary');
    upsertMetaTag('twitter:title', title);
    upsertMetaTag('twitter:description', description);
    upsertMetaTag('twitter:image', image);
    setCanonicalLink(url);

    const offerCatalogItems = properties.slice(0, 10).map((property, index) => ({
      '@type': 'Offer',
      url: `${DEFAULT_SITE_URL}/oglas?id=${property.id}`,
      position: index + 1,
    }));

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: agency.name,
      url,
      description,
      logo: image,
      address: {
        '@type': 'PostalAddress',
        addressLocality: agency.city?.name || agency.location || undefined,
        addressCountry: 'RS',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Serbia',
      },
      hasOfferCatalog: offerCatalogItems.length > 0 ? {
        '@type': 'OfferCatalog',
        itemListElement: offerCatalogItems,
      } : undefined,
    };

    if (agency.phone) {
      jsonLd.telephone = agency.phone;
    }

    if (agency.email) {
      jsonLd.email = agency.email;
    }

    upsertJsonLd('ld-json-agency', jsonLd);
  }, [agency, i18n.language, properties]);

  return <AgencyDetails agency={agency} properties={properties} />;
}
