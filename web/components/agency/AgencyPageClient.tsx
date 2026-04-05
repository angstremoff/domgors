'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AgencyDetails } from '@/components/agency/AgencyDetails';
import { useTranslation } from 'react-i18next';
import { generateAgencyDescription, generateAgencyTitle } from '@/lib/seo-utils';
import { DEFAULT_SITE_URL, setCanonicalLink, upsertJsonLd, upsertMetaTag } from '@/lib/seo-head';
import type { Database } from '@shared/lib/database.types';

type Agency = Database['public']['Tables']['agency_profiles']['Row'] & {
  city?: { name: string } | null;
};
type Property = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export function AgencyPageClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [agency, setAgency] = useState<Agency | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t, i18n } = useTranslation();
  const supabase = createClient();

  useEffect(() => {
    if (!id) return;

    const loadAgency = async () => {
      const { data: agencyData } = await supabase
        .from('agency_profiles')
        .select(`
          *,
          city:cities(name)
        `)
        .eq('id', id)
        .single();

      let resolvedAgency = agencyData as Agency | null;

      if (!resolvedAgency) {
        const { data: fallbackData } = await supabase
          .from('agency_profiles')
          .select(`
            *,
            city:cities(name)
          `)
          .eq('user_id', id)
          .single();
        resolvedAgency = fallbackData as Agency | null;
      }

      if (!resolvedAgency) {
        setError(true);
        setLoading(false);
        return;
      }

      setAgency(resolvedAgency);

      const { data: propertiesByAgency } = await supabase
        .from('properties')
        .select(`
          *,
          city:cities(name),
          district:districts(name)
        `)
        .eq('agency_id', resolvedAgency.id)
        .order('created_at', { ascending: false })
        .limit(60);

      if (propertiesByAgency && propertiesByAgency.length > 0) {
        setProperties(propertiesByAgency as Property[]);
      } else {
        const { data: fallbackProperties } = await supabase
          .from('properties')
          .select(`
            *,
            city:cities(name),
            district:districts(name)
          `)
          .eq('user_id', resolvedAgency.user_id)
          .order('created_at', { ascending: false })
          .limit(60);
        setProperties((fallbackProperties as Property[]) || []);
      }

      setLoading(false);
    };

    loadAgency();
  }, [id, supabase]);

  useEffect(() => {
    if (!agency || !id) {
      return;
    }

    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'sr';
    const title = generateAgencyTitle(agency, lang);
    const description = generateAgencyDescription(agency, lang);
    const image = agency.logo_url || `${DEFAULT_SITE_URL}/logo.png`;
    const url = `${DEFAULT_SITE_URL}/agencija/?id=${id}`;

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
      url: `${DEFAULT_SITE_URL}/oglas/?id=${property.id}`,
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
  }, [agency, id, i18n.language, properties]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text mb-4">{t('common.notFound')}</h1>
        <p className="text-textSecondary">{t('agency.notFound', 'Agencija nije pronađena')}</p>
      </div>
    );
  }

  return <AgencyDetails agency={agency} properties={properties} />;
}
