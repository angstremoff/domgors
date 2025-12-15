// Важно: сначала импортируем полифил URL
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './database.types';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Отдельный лог вместо throw, чтобы не падать на ранней стадии и дать понять, что нужна конфигурация
  console.error('Отсутствуют данные Supabase. Проверьте SUPABASE_URL и SUPABASE_ANON_KEY в .env');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
