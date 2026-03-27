import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';
import { getSupabasePublicEnv } from './env';

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cachedBrowserClient: BrowserClient | null = null;

export function createClient() {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  cachedBrowserClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  }) as unknown as BrowserClient;

  return cachedBrowserClient;
}
