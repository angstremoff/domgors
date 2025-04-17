import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Создаем клиент Supabase
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
    const { data } = await supabase.auth.getSession();
    
    if (data.session) {
      lastTokenRefresh = now;
      console.log('Сессия проверена:', now);
    }
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
  } finally {
    isRefreshingToken = false;
  }
};

// Настраиваем обработчик ошибок для существующего клиента
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    console.log('Событие авторизации:', event);
    lastTokenRefresh = Date.now();
  }
  
  if (event === 'USER_UPDATED') {
    console.log('Профиль пользователя обновлен');
    refreshToken();
  }
});

/**
 * Периодическая проверка токенов для обеспечения актуальности и предотвращения ошибок
 */
setInterval(async () => {
  // Проверяем токен каждые 30 минут
  if (lastTokenRefresh === 0 || Date.now() - lastTokenRefresh > 30 * 60 * 1000) {
    await refreshToken();
  }
}, 10 * 60 * 1000); // Проверяем каждые 10 минут

export { supabase };
