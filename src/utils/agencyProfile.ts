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

export interface AgencyProfileFormData {
  name: string;
  email: string;
  site: string;
  location: string;
  logo_url: string;
}

export type AgencySupabaseClient = {
  from: (table: 'agency_profiles') => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: AgencyProfileRow | null; error: unknown | null }>;
      };
    };
    upsert: (values: Record<string, unknown>, options: { onConflict: string }) => {
      select: (columns: string) => {
        single: () => Promise<{ data: AgencyProfileRow | null; error: unknown | null }>;
      };
    };
  };
  storage: {
    from: (bucket: string) => {
      upload: (path: string, body: Blob | File, options?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export const fetchAgencyProfileByUserId = async (
  supabase: AgencySupabaseClient,
  userId: string,
): Promise<AgencyProfileFormData | null> => {
  const { data, error } = await supabase
    .from('agency_profiles')
    .select('id, name, email, site, location, logo_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    name: (data as Record<string, unknown>).name as string || '',
    email: (data as Record<string, unknown>).email as string || '',
    site: (data as Record<string, unknown>).site as string || '',
    location: (data as Record<string, unknown>).location as string || '',
    logo_url: (data as Record<string, unknown>).logo_url as string || '',
  };
};

export const upsertAgencyProfile = async (
  supabase: AgencySupabaseClient,
  userId: string,
  data: AgencyProfileFormData,
): Promise<AgencyProfileFormData> => {
  const payload = {
    user_id: userId,
    name: data.name || null,
    email: data.email || null,
    site: data.site || null,
    location: data.location || null,
    logo_url: data.logo_url || null,
  };

  const { data: result, error } = await supabase
    .from('agency_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('name, email, site, location, logo_url')
    .single();

  if (error) throw error;
  if (!result) throw new Error('Agency profile upsert returned no data');

  return {
    name: (result as Record<string, unknown>).name as string || '',
    email: (result as Record<string, unknown>).email as string || '',
    site: (result as Record<string, unknown>).site as string || '',
    location: (result as Record<string, unknown>).location as string || '',
    logo_url: (result as Record<string, unknown>).logo_url as string || '',
  };
};

export const uploadAgencyLogo = async (
  supabase: AgencySupabaseClient,
  userId: string,
  file: Blob | File,
): Promise<string> => {
  const ext = file instanceof File ? (file.name.split('.').pop()?.toLowerCase() || 'jpg') : 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const fileName = `agency-logos/${userId}/${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from('agency-logos')
    .upload(fileName, file, {
      contentType: file instanceof File ? file.type || `image/${safeExt}` : `image/${safeExt}`,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('agency-logos').getPublicUrl(fileName);
  return data.publicUrl;
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
