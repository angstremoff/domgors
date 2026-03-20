import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@shared/lib/database.types';
import { getSupabasePublicEnv } from './env';

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
