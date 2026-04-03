import type { Database } from '../lib/database.types';

type AgencyProfileRow = Database['public']['Tables']['agency_profiles']['Row'];
type AgencyProfileSource = Partial<AgencyProfileRow> & Record<string, unknown>;

export interface NormalizedAgencyProfile {
  id: string;
  user_id: string | null;
  city_id: number | null;
  created_at: string | null;
  name: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  email: string | null;
  site: string | null;
  location: string | null;
  telegram: string | null;
  instagram: string | null;
  facebook: string | null;
}

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const getFirstString = (source: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = asNonEmptyString(source[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

export const isTelegramValue = (value: string | null): boolean => {
  if (!value) {
    return false;
  }

  return value.startsWith('@') || /^(https?:\/\/)?t\.me\//i.test(value);
};

export const formatAgencySiteUrl = (site?: string | null): string | null => {
  const normalizedSite = asNonEmptyString(site);
  if (!normalizedSite) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedSite)) {
    return normalizedSite;
  }

  return `https://${normalizedSite}`;
};

export const formatAgencyTelegramUrl = (telegram?: string | null): string | null => {
  const normalizedTelegram = asNonEmptyString(telegram);
  if (!normalizedTelegram) {
    return null;
  }

  if (/^https?:\/\//i.test(normalizedTelegram)) {
    return normalizedTelegram;
  }

  if (normalizedTelegram.startsWith('@')) {
    return `https://t.me/${normalizedTelegram.slice(1)}`;
  }

  if (/^t\.me\//i.test(normalizedTelegram)) {
    return `https://${normalizedTelegram}`;
  }

  return `https://t.me/${normalizedTelegram.replace(/^\/+/, '')}`;
};

export const normalizeAgencyProfile = (
  source?: AgencyProfileSource | null
): NormalizedAgencyProfile | null => {
  if (!source) {
    return null;
  }

  const rawSite = getFirstString(source, ['site', 'website']);
  const explicitTelegram = getFirstString(source, ['telegram', 'telegram_url']);
  const siteLooksLikeTelegram = isTelegramValue(rawSite);

  return {
    id: getFirstString(source, ['id']) ?? '',
    user_id: getFirstString(source, ['user_id']),
    city_id: typeof source.city_id === 'number' ? source.city_id : null,
    created_at: getFirstString(source, ['created_at']),
    name: getFirstString(source, ['name']),
    phone: getFirstString(source, ['phone']),
    logo_url: getFirstString(source, ['logo_url']),
    description: getFirstString(source, ['description']),
    email: getFirstString(source, ['email', 'mail', 'contact_email']),
    site: siteLooksLikeTelegram ? null : rawSite,
    location: getFirstString(source, ['location', 'address', 'addr']),
    telegram: explicitTelegram ?? (siteLooksLikeTelegram ? rawSite : null),
    instagram: getFirstString(source, ['instagram', 'instagram_url']),
    facebook: getFirstString(source, ['facebook', 'facebook_url']),
  };
};
