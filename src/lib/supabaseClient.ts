import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Создаем базовый клиент
const baseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Последнее время обновления токена
let lastTokenRefresh = 0;
// Минимальный интервал между обновлениями токена (15 секунд)
const TOKEN_REFRESH_INTERVAL = 15000;
// Флаг, указывающий, выполняется ли в данный момент обновление токена
let isRefreshingToken = false;
// Счетчик активных запросов
let activeRequests = 0;

/**
 * Функция для обновления токена авторизации
 */
const refreshToken = async () => {
  const now = Date.now();
  
  // Предотвращаем слишком частое обновление токена
  if (now - lastTokenRefresh < TOKEN_REFRESH_INTERVAL || isRefreshingToken) {
    return;
  }
  
  isRefreshingToken = true;
  
  try {
    // Проверяем текущую сессию
    const { data: { session } } = await baseClient.auth.getSession();
    
    if (session) {
      lastTokenRefresh = now;
      console.log('Сессия проверена:', now);
    }
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
  } finally {
    isRefreshingToken = false;
  }
};

/**
 * Расширенный клиент Supabase с улучшенной обработкой ошибок авторизации
 */
class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>;
  
  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }
  
  get auth() {
    return this.client.auth;
  }
  
  get storage() {
    return this.client.storage;
  }
  
  // Переопределяем метод from для добавления обработки ошибок авторизации
  from(table: string) {
    const original = this.client.from(table);
    
    // Увеличиваем счетчик активных запросов
    activeRequests++;
    
    // Инициируем проверку токена при большом количестве запросов
    if (activeRequests > 3) {
      refreshToken();
    }
    
    // Создаем обертку для обработки ошибок
    const enhancedMethods = {
      ...original,
      
      // Переопределяем метод select
      select: async (columns?: string) => {
        try {
          const result = await original.select(columns);
          
          // При успешном выполнении уменьшаем счетчик запросов
          activeRequests = Math.max(0, activeRequests - 1);
          
          // Проверяем на ошибки авторизации
          if (result.error?.code === '401' || result.error?.code === '403') {
            console.warn('Ошибка авторизации при запросе, обновляем токен...');
            await refreshToken();
            // Повторяем запрос после обновления токена
            return await original.select(columns);
          }
          
          return result;
        } catch (error: any) {
          // Обрабатываем ошибку и возможно повторяем запрос
          console.error(`Ошибка при выполнении select в таблице ${table}:`, error);
          
          // Уменьшаем счетчик запросов
          activeRequests = Math.max(0, activeRequests - 1);
          
          // Если ошибка связана с авторизацией, пробуем обновить токен и повторить
          if (error.code === '401' || error.code === '403' || error.message?.includes('auth')) {
            await refreshToken();
            return await original.select(columns);
          }
          
          throw error;
        }
      },
      
      // Переопределяем метод insert
      insert: async (values: any, options?: any) => {
        try {
          // Проверяем токен перед важной операцией
          await refreshToken();
          
          const result = await original.insert(values, options);
          
          // Уменьшаем счетчик запросов
          activeRequests = Math.max(0, activeRequests - 1);
          
          // Проверяем на ошибки авторизации
          if (result.error?.code === '401' || result.error?.code === '403') {
            console.warn('Ошибка авторизации при вставке, обновляем токен...');
            await refreshToken();
            // Повторяем запрос после обновления токена
            return await original.insert(values, options);
          }
          
          return result;
        } catch (error: any) {
          console.error(`Ошибка при выполнении insert в таблице ${table}:`, error);
          
          // Уменьшаем счетчик запросов
          activeRequests = Math.max(0, activeRequests - 1);
          
          // Если ошибка связана с авторизацией, пробуем обновить токен и повторить
          if (error.code === '401' || error.code === '403' || error.message?.includes('auth')) {
            await refreshToken();
            return await original.insert(values, options);
          }
          
          throw error;
        }
      },
      
      // Другие методы можно добавить по аналогии
    };
    
    return enhancedMethods;
  }
}

// Экспортируем улучшенный клиент Supabase
export const supabase = new EnhancedSupabaseClient(baseClient);
