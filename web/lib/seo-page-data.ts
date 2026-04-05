import { cache } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';
import {
  generateAgencyDescription,
  generateAgencyTitle,
  generatePropertyDescription,
  generatePropertyTitle,
} from './seo-utils';
import { getSupabasePublicEnv } from './supabase/env';

const SITE_URL = 'https://domgo.rs';

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type SearchParamsInput = Promise<SearchParamsRecord>;

export type PropertyPageProperty = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
  user?: { name: string; phone: string; is_agency?: boolean } | null;
};

export type AgencyPageAgency = Database['public']['Tables']['agency_profiles']['Row'] & {
  city?: { name: string } | null;
};

export type AgencyPageProperty = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

function createPublicSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export async function resolveSearchParams(searchParams: SearchParamsInput): Promise<SearchParamsRecord> {
  return searchParams;
}

export function getSingleSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export const getPropertyPageData = cache(async (id: string): Promise<PropertyPageProperty | null> => {
  if (!id) {
    return null;
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      user:users(name, phone, is_agency),
      city:cities(name),
      district:districts(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PropertyPageProperty;
});

export const getAgencyPageData = cache(async (
  id: string
): Promise<{ agency: AgencyPageAgency; properties: AgencyPageProperty[] } | null> => {
  if (!id) {
    return null;
  }

  const supabase = createPublicSupabaseClient();

  const { data: agencyById, error: agencyByIdError } = await supabase
    .from('agency_profiles')
    .select(`
      *,
      city:cities(name)
    `)
    .eq('id', id)
    .maybeSingle();

  let agency = agencyById as AgencyPageAgency | null;

  if (agencyByIdError && agencyByIdError.code !== 'PGRST116') {
    return null;
  }

  if (!agency) {
    const { data: agencyByUserId, error: agencyByUserIdError } = await supabase
      .from('agency_profiles')
      .select(`
        *,
        city:cities(name)
      `)
      .eq('user_id', id)
      .maybeSingle();

    if (agencyByUserIdError && agencyByUserIdError.code !== 'PGRST116') {
      return null;
    }

    agency = agencyByUserId as AgencyPageAgency | null;
  }

  if (!agency) {
    return null;
  }

  const { data: propertiesByAgency, error: propertiesByAgencyError } = await supabase
    .from('properties')
    .select(`
      *,
      city:cities(name),
      district:districts(name)
    `)
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })
    .limit(60);

  if (propertiesByAgencyError) {
    return null;
  }

  let properties = (propertiesByAgency as AgencyPageProperty[] | null) ?? [];

  if (properties.length === 0) {
    const { data: propertiesByUserId, error: propertiesByUserIdError } = await supabase
      .from('properties')
      .select(`
        *,
        city:cities(name),
        district:districts(name)
      `)
      .eq('user_id', agency.user_id)
      .order('created_at', { ascending: false })
      .limit(60);

    if (propertiesByUserIdError) {
      return null;
    }

    properties = (propertiesByUserId as AgencyPageProperty[] | null) ?? [];
  }

  return {
    agency,
    properties,
  };
});

export function buildPropertyMetadata(property: PropertyPageProperty): Metadata {
  const title = generatePropertyTitle(property, 'sr');
  const description = generatePropertyDescription(property, 'sr');
  const url = `${SITE_URL}/oglas?id=${property.id}`;
  const image = property.images?.[0] || `${SITE_URL}/placeholder-property.jpg`;

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'website',
      locale: 'sr_RS',
      siteName: 'DomGo.rs',
      url,
      title,
      description,
      images: [
        {
          url: image,
          alt: property.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildAgencyMetadata(data: {
  agency: AgencyPageAgency;
  properties: AgencyPageProperty[];
}): Metadata {
  const title = generateAgencyTitle(data.agency, 'sr');
  const description = generateAgencyDescription(data.agency, 'sr');
  const url = `${SITE_URL}/agencija?id=${data.agency.id}`;
  const image = data.agency.logo_url || `${SITE_URL}/logo.png`;

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: 'profile',
      locale: 'sr_RS',
      siteName: 'DomGo.rs',
      url,
      title,
      description,
      images: [
        {
          url: image,
          alt: data.agency.name,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildPropertyNotFoundMetadata(): Metadata {
  return {
    title: {
      absolute: 'Oglas nije pronađen | DomGo.rs',
    },
    description: 'Traženi oglas ne postoji ili je uklonjen.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export function buildAgencyNotFoundMetadata(): Metadata {
  return {
    title: {
      absolute: 'Agencija nije pronađena | DomGo.rs',
    },
    description: 'Tražena agencija ne postoji ili je uklonjena.',
    robots: {
      index: false,
      follow: false,
    },
  };
}
