import type { User } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

type UsersInsert = Database['public']['Tables']['users']['Insert'];
type UsersRow = Database['public']['Tables']['users']['Row'];
type ContactProfileRow = Pick<UsersRow, 'name' | 'phone' | 'email' | 'avatar_url'>;

type UpsertResponse<T> = PromiseLike<{ data: T | null; error: unknown | null }> & {
  select: (columns: string) => {
    single: () => PromiseLike<{ data: T | null; error: unknown | null }>;
  };
};

export type ContactProfileClient = {
  from: (table: 'users') => {
    select: (columns: string) => {
      eq: (column: 'id', value: string) => {
        maybeSingle: () => PromiseLike<{ data: ContactProfileRow | null; error: unknown | null }>;
      };
    };
    upsert: (values: UsersInsert, options: { onConflict: 'id' }) => UpsertResponse<ContactProfileRow>;
  };
  auth: {
    updateUser: (attributes: {
      data: {
        name: string | null;
        phone: string | null;
      };
    }) => Promise<unknown>;
  };
};

export interface ContactProfile {
  name: string;
  phone: string;
  email: string;
  avatar_url: string | null;
}

export type ContactProfileValidationField = 'name' | 'phone';

type ContactProfileSource = Partial<Pick<UsersRow, 'name' | 'phone' | 'email' | 'avatar_url'>> | null | undefined;

const normalizeText = (value?: string | null) => value?.trim() ?? '';

export const normalizeContactProfile = (
  source?: ContactProfileSource,
  fallbackEmail = ''
): ContactProfile => ({
  name: normalizeText(source?.name),
  phone: normalizeText(source?.phone),
  email: normalizeText(source?.email) || normalizeText(fallbackEmail),
  avatar_url: source?.avatar_url ?? null,
});

export const getContactProfileValidationError = (
  profile: Pick<ContactProfile, 'name' | 'phone'>
): ContactProfileValidationField | null => {
  if (!normalizeText(profile.name)) {
    return 'name';
  }

  if (!normalizeText(profile.phone)) {
    return 'phone';
  }

  return null;
};

export const hasCompleteContactProfile = (
  profile: Pick<ContactProfile, 'name' | 'phone'>
) => {
  return normalizeText(profile.name).length > 0 && normalizeText(profile.phone).length > 0;
};

export const buildContactProfileUpsert = ({
  userId,
  email,
  profile,
}: {
  userId: string;
  email?: string | null;
  profile: Pick<ContactProfile, 'name' | 'phone'>;
}): UsersInsert => ({
  id: userId,
  email: normalizeText(email),
  name: normalizeText(profile.name) || null,
  phone: normalizeText(profile.phone) || null,
});

export const ensureUserContactProfile = async (
  supabase: ContactProfileClient,
  authUser: User | null
) => {
  if (!authUser) {
    return;
  }

  const payload: UsersInsert = {
    id: authUser.id,
    email: normalizeText(authUser.email),
  };

  await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' });
};

export const fetchContactProfile = async (
  supabase: ContactProfileClient,
  userId: string,
  fallbackEmail = ''
) => {
  const { data, error } = await supabase
    .from('users')
    .select('name, phone, email, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeContactProfile(data, fallbackEmail);
};

export const saveContactProfile = async (
  supabase: ContactProfileClient,
  {
    userId,
    email,
    profile,
  }: {
    userId: string;
    email?: string | null;
    profile: Pick<ContactProfile, 'name' | 'phone'>;
  }
) => {
  const payload = buildContactProfileUpsert({ userId, email, profile });
  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select('name, phone, email, avatar_url')
    .single();

  if (error) {
    throw error;
  }

  try {
    await supabase.auth.updateUser({
      data: {
        name: payload.name ?? null,
        phone: payload.phone ?? null,
      },
    });
  } catch {
    // users является продуктовым источником правды для контактных данных объявления.
  }

  return normalizeContactProfile(data, payload.email);
};
