import { supabase } from '../lib/supabaseClient';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../lib/database.types';
import { compressImage } from '../utils/imageCompression';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';
import { retry, withTimeout } from '../utils/apiHelpers';
import { logError } from '../utils/sentry';
import { Logger } from '../utils/logger';
import { propertyCache, apiCache } from '../utils/cacheManager';
import { normalizePropertyRooms } from '../utils/propertyRules';
import { applyPropertyQueryFilters, buildFiltersCacheKey, type PropertyQueryFilters } from '../utils/propertyQueryFilters';
import {
  buildPropertyImagePath,
  extractPropertyImagePath,
  PROPERTY_STORAGE_BUCKET,
} from '../utils/propertyStorage';

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
type AllowedImageExtension = typeof ALLOWED_IMAGE_EXTENSIONS[number];
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const STORAGE_BUCKET = PROPERTY_STORAGE_BUCKET;

const ensureAllowedExtension = (ext: string): AllowedImageExtension => {
  const normalized = ext.toLowerCase();
  if ((ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(normalized)) {
    return normalized as AllowedImageExtension;
  }

  throw new Error(`Неподдерживаемый формат изображения: ${ext}. Допустимы: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`);
};

const ensureFileNotTooLarge = (bytes: number, context: string) => {
  if (bytes > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(`${context} превышает максимальный размер ${Math.round(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024))} МБ`);
  }
};

const extractBase64Payload = (value: string) => {
  return value.includes('base64,') ? value.split('base64,')[1] : value;
};


// Таймштамп последнего обновления данных в БД
// Для отслеживания изменений и своевременной инвалидации кэша
const lastDataUpdate = { timestamp: Date.now() };

/**
 * Возвращает таймштамп последней инвалидации кэша.
 * Используется для синхронизации внешних кэшей (например, в PropertyContext).
 */
export const getCacheTimestamp = () => lastDataUpdate.timestamp;

/**
 * Инвалидирует кэш для обновления данных после изменений
 * @param type - Тип кэша для инвалидации ('all', 'sale', 'rent') или undefined для всех типов
 * @param propertyId - ID объявления для инвалидации конкретного кэша деталей объявления
 */
export const invalidateCache = (type?: 'all' | 'sale' | 'rent', propertyId?: string) => {
  Logger.debug(`Инвалидация кэша: ${type || 'все'} ${propertyId ? `для объявления ${propertyId}` : ''}`);
  lastDataUpdate.timestamp = Date.now();
  
  // Если указан ID объявления, инвалидируем кэш через LRU Cache Manager
  if (propertyId) {
    propertyCache.delete(`detail-${propertyId}`);
    apiCache.delete(`property-${propertyId}`);
  }
  
  // Инвалидируем кэш по указанному типу или все типы
  if (type) {
    propertyCache.delete(`list-${type}`);
    apiCache.delete(`list-${type}`);
  } else {
    // Полная очистка кэша
    propertyCache.clear();
    apiCache.clear();
  }
};

// Флаги для отслеживания активных запросов
const activeRequests = {
  all: false,
  sale: false,
  rent: false,
  byId: new Set()
};

const updateOwnedPropertyStatus = async (propertyId: string, status: 'active' | 'sold' | 'rented') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Пользователь не авторизован');
  }

  const { data, error } = await supabase
    .from('properties')
    .update({ status })
    .eq('id', propertyId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Объявление не найдено или нет прав на редактирование');
  }

  invalidateCache(undefined, propertyId);
};



type PropertyInsert = Database['public']['Tables']['properties']['Insert'];

/**
 * Полная очистка кэша объявлений
 * Вызывается после создания или изменения объявления
 */
const clearCache = () => {
  Logger.debug('Полная очистка кэша объявлений');
  
  // Очищаем все кэши через LRU Cache Manager
  propertyCache.clear();
  apiCache.clear();
  
  // Сбрасываем флаги активных запросов
  activeRequests.all = false;
  activeRequests.sale = false;
  activeRequests.rent = false;
  activeRequests.byId.clear();
  
  // Обновляем время последнего обновления
  lastDataUpdate.timestamp = Date.now();
};

export const propertyService = {
  clearCache,
  /**
   * Инвалидирует кэш для обновления данных после изменений
   * @param type - Тип кэша для инвалидации ('all', 'sale', 'rent') или undefined для всех типов
   * @param propertyId - ID объявления для инвалидации конкретного кэша деталей объявления
   */
  invalidateCache(type?: 'all' | 'sale' | 'rent', propertyId?: string) {
    invalidateCache(type, propertyId);
  },
  async getProperties(page = 1, pageSize = 10) {
    const cacheKey = `list-all-p${page}`;
    
    // Проверяем кэш через LRU Cache Manager
    const cached = propertyCache.get(cacheKey);
    if (cached && page === 1) {
      Logger.debug('Возвращаем кэшированные данные вместо нового запроса');
      return cached;
    }
    
    // Проверяем есть ли активный запрос
    if (activeRequests.all && page === 1) {
      Logger.debug('Активный запрос getProperties уже выполняется, ожидаем...');
      if (cached) {
        return cached;
      }
    }
    
    try {
      activeRequests.all = true;
      
      // Вычисляем начальную позицию для пагинации
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      Logger.debug(`Загружаем объявления: страница ${page}, размер страницы ${pageSize}, диапазон ${from}-${to}`);
      
      // Используем retry и withTimeout для улучшения надежности запросов
      const response = await retry<{
        data: any[] | null;
        error: any | null;
        count: number | null;
      }>(async () => {
        const promise = supabase
          .from('properties')
          .select(`
            *,
            user:users(name, phone, is_agency),
            city:cities(name),
            district:districts(id, name, city_id),
            agency:agency_profiles(id, name, phone, logo_url, description)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to);
          
        return withTimeout(
          promise,
          15000, // 15 секунд таймаут
          'Превышено время ожидания запроса списка объявлений'
        );
      }, 3, 1000); // 3 попытки с интервалом 1 секунда
        
      const { data, error, count } = response as {
        data: any[] | null;
        error: any | null;
        count: number | null;
      };
      
      if (error) {
        logError(error, { context: 'getProperties', page, pageSize });
        throw error;
      }
      
      const result = { 
        data: data || [], 
        totalCount: count || 0,
        hasMore: (count || 0) > to + 1
      };
      
      // Сохраняем в кэш через LRU Cache Manager
      if (page === 1) {
        propertyCache.set(cacheKey, result);
      }
      
      Logger.debug(`Загружено объявлений: ${data?.length || 0} из ${count || 'неизвестно'}`);
      return result;
    } catch (error) {
      Logger.error('Ошибка при получении объявлений:', error);
      logError(error as Error, { context: 'getProperties', page, pageSize });
      return { data: [], totalCount: 0, hasMore: false };
    } finally {
      activeRequests.all = false;
    }
  },

  async getPropertyById(id: string) {
    const cacheKey = `detail-${id}`;
    
    // Проверяем кэш через LRU Cache Manager
    const cached = propertyCache.get(cacheKey);
    if (cached) {
      Logger.debug(`Возвращаем кэшированные данные объявления ${id}`);
      return cached;
    }
    
    // Проверяем есть ли активный запрос на это объявление
    if (activeRequests.byId.has(id)) {
      Logger.debug(`Активный запрос getPropertyById(${id}) уже выполняется, ожидаем...`);
      // Возвращаем кэшированные данные если есть
      if (cached) {
        return cached;
      }
    }
    
    try {
      // Помечаем запрос как активный
      activeRequests.byId.add(id);
      
      // Используем retry и withTimeout для улучшения надежности запроса
      const response = await retry<{
        data: any | null;
        error: any | null;
      }>(async () => {
        // Создаем запрос к Supabase
        const query = supabase
          .from('properties')
          .select(`
            *,
            user:users(name, phone, is_agency),
            city:cities(name),
            district:districts(id, name, city_id),
            agency:agency_profiles(id, name, phone, logo_url, description)
          `)
          .eq('id', id)
          .single();
          
        // Добавляем таймаут к запросу
        return withTimeout<{ data: any | null; error: any | null }>(
          Promise.resolve(query) as Promise<{ data: any | null; error: any | null }>,
          10000, // 10 секунд таймаут
          `Превышено время ожидания данных объявления ${id}`
        );
      }, 3, 1000); // 3 попытки с интервалом 1 секунда
        
      const { data, error } = response as {
        data: any | null;
        error: any | null;
      };
      
      if (error) {
        logError(error, { context: 'getPropertyById', propertyId: id });
        throw error;
      }
      
      // Сохраняем в кэш через LRU Cache Manager
      if (data) {
        propertyCache.set(cacheKey, data);
      }
      
      Logger.debug('Данные объявления из базы, id:', data?.id);
      return data;
    } catch (error) {
      Logger.error('Ошибка при получении объявления:', error);
      logError(error as Error, { context: 'getPropertyById', propertyId: id });
      return null;
    } finally {
      // Удаляем из списка активных запросов
      activeRequests.byId.delete(id);
    }
  },

  async getUserProperties() {
    try {
      // Получаем текущего пользователя с использованием retry
      const userResponse = await retry<{ data: { user: any | null }, error: any | null }>(async () => {
        return withTimeout(
          supabase.auth.getUser(),
          8000,
          'Превышено время ожидания данных пользователя'
        );
      }, 2);
      
      const { data: { user } } = userResponse;
      
      if (!user) return [];
      
      // Получаем объявления пользователя с использованием retry
      const response = await retry<{
        data: any[] | null;
        error: any | null;
      }>(async () => {
        const promise = supabase
          .from('properties')
          .select(`
            *,
            user:users(name, phone, is_agency),
            city:cities(name),
            district:districts(id, name, city_id),
            agency:agency_profiles(id, name, phone, logo_url, description)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        return withTimeout(
          promise,
          12000, // 12 секунд таймаут
          'Превышено время ожидания списка ваших объявлений'
        );
      }, 3, 1000);
        
      const { data, error } = response as {
        data: any[] | null;
        error: any | null;
      };
      
      if (error) {
        logError(error, { context: 'getUserProperties', userId: user.id });
        throw error;
      }
      
      return data || [];
    } catch (error) {
      Logger.error('Ошибка при получении списка объявлений пользователя:', error);
      logError(error as Error, { context: 'getUserProperties' });
      return [];
    }
  },

  async getUserPropertiesCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      Logger.error('Ошибка при получении количества объявлений пользователя:', error);
      return 0;
    }
  },

  async createProperty(propertyData: Partial<PropertyInsert>) {
    try {
      // Получение UUID пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Пользователь не авторизован');
      
      // Подготовка данных для вставки
      const propertyForInsert: PropertyInsert = {
        ...propertyData,
        title: propertyData.title ?? '',
        description: propertyData.description ?? '',
        price: propertyData.price ?? 0,
        type: propertyData.type ?? 'sale',
        property_type: propertyData.property_type ?? 'apartment',
        area: propertyData.area ?? 0,
        rooms: normalizePropertyRooms(propertyData.property_type, propertyData.rooms) ?? 0,
        location: propertyData.location ?? '',
        user_id: user.id,
        // Добавляем пустой массив изображений, если он не предоставлен
        images: propertyData.images || [],
        status: 'active', // По умолчанию активное объявление
      };
      
      // Добавление объявления в базу данных
      const { data, error } = await supabase
        .from('properties')
        .insert(propertyForInsert)
        .select()
        .single();
        
      if (error) throw error;
      
      // Инвалидируем весь кэш после успешного создания
      invalidateCache(); // Обновляем все списки, т.к. добавлено новое объявление
      
      Logger.debug('Объявление успешно создано:', data);
      return { success: true, data };
    } catch (error) {
      Logger.error('Ошибка при создании объявления:', error);
      return { success: false, error };
    }
  },
  
  async markAsSold(propertyId: string) {
    await updateOwnedPropertyStatus(propertyId, 'sold');
  },

  async markAsRented(propertyId: string) {
    await updateOwnedPropertyStatus(propertyId, 'rented');
  },
  
  async markAsActive(id: string) {
    try {
      await updateOwnedPropertyStatus(id, 'active');
      
      Logger.debug('Статус объявления успешно обновлен на active:', id);
      return { success: true };
    } catch (error) {
      Logger.error('Ошибка при обновлении статуса объявления:', error);
      return { success: false, error };
    }
  },
  
  async deleteProperty(propertyId: string) {
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Проверяем, является ли пользователь владельцем объявления
      const { data: property, error: checkError } = await supabase
        .from('properties')
        .select('user_id, images')
        .eq('id', propertyId)
        .single();
      
      if (checkError) throw checkError;
      
      // Если текущий пользователь не владелец объявления
      if (!property || property.user_id !== user.id) {
        Logger.error('Отказано в доступе: пользователь не является владельцем объявления');
        return { success: false, error: 'Отказано в доступе: вы не являетесь владельцем этого объявления' };
      }
      
      // Удаляем фотографии из хранилища, если они есть
      if (property.images && property.images.length > 0) {
        try {
          const fileNames = property.images
            .map((imageUrl: string) => extractPropertyImagePath(imageUrl))
            .filter((value): value is string => Boolean(value));
          
          if (fileNames.length > 0) {
            Logger.debug('Удаление файлов из хранилища:', fileNames);
            
            // Удаляем все файлы из бакета с изображениями
            const { error: storageError } = await supabase
              .storage
              .from(STORAGE_BUCKET)
              .remove(fileNames);
            
            if (storageError) {
              Logger.error('Ошибка при удалении файлов из хранилища:', storageError);
              // Продолжаем удаление объявления даже если не удалось удалить фото
            } else {
              Logger.debug('Все фотографии успешно удалены из хранилища');
            }
          }
        } catch (storageError) {
          Logger.error('Ошибка при попытке удаления файлов:', storageError);
          // Продолжаем процесс удаления объявления даже если не удалось удалить фото
        }
      }
      
      // Продолжаем удаление объявления из базы данных
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);
        
      if (error) throw error;
      
      // Инвалидируем весь кэш после удаления объявления
      invalidateCache(); // Полностью обновляем все списки
      
      Logger.debug('Объявление успешно удалено:', propertyId);
      return { success: true };
    } catch (error) {
      Logger.error('Ошибка при удалении объявления:', error);
      return { success: false, error };
    }
  },

  async getPropertiesByType(type: 'sale' | 'rent' | 'newBuildings', page = 1, pageSize = 10, filters?: PropertyQueryFilters) {
    // Включаем фильтры в ключ кэша, чтобы разные наборы не коллизировали
    const cacheKey = `list-${type}-f${buildFiltersCacheKey(filters)}-p${page}`;
    
    // Проверяем кэш через LRU Cache Manager
    const cached = propertyCache.get(cacheKey);
    if (cached && page === 1) {
      Logger.debug(`Возвращаем кэшированные данные типа ${type} вместо нового запроса`);
      return cached;
    }
    
    // Проверяем есть ли активный запрос
    const requestKey = type === 'newBuildings' ? 'sale' : type;
    if (activeRequests[requestKey] && page === 1) {
      Logger.debug(`Активный запрос getPropertiesByType(${type}) уже выполняется, ожидаем...`);
      if (cached) {
        return cached;
      }
    }
    
    try {
      activeRequests[requestKey] = true;
      
      // Вычисляем начальную позицию для пагинации
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      Logger.debug(`Загружаем объявления типа ${type}: страница ${page}, размер страницы ${pageSize}, диапазон ${from}-${to}`);
      
      let query = supabase
        .from('properties')
        .select(`
          *,
          user:users(name, phone, is_agency),
          city:cities(name),
          district:districts(id, name, city_id),
          agency:agency_profiles(id, name, phone, logo_url, description)
        `, { count: 'exact' });
      
      // Специальная логика для новостроек
      if (type === 'newBuildings') {
        Logger.debug('Применяем фильтрацию для новостроек: type=sale AND is_new_building=true');
        query = query
          .eq('type', 'sale') // Фильтруем по типу "Продажа"
          .eq('is_new_building', true); // И добавляем фильтр по флагу новостройки
      } else {
        Logger.debug(`Применяем стандартную фильтрацию для типа: ${type}`);
        query = query.eq('type', type);
      }

      // Серверная фильтрация по категории/городу/району (чтобы при пагинации
      // следующая страница приходила уже отфильтрованной, без «хвоста»).
      // Безопасна: при отсутствии filters не применяет ни одного условия.
      query = applyPropertyQueryFilters(query, filters);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      const result = { 
        data: data || [], 
        totalCount: count || 0,
        hasMore: (count || 0) > to + 1
      };
      
      // Сохраняем в кэш через LRU Cache Manager
      if (page === 1) {
        propertyCache.set(cacheKey, result);
      }
      
      Logger.debug(`Загружено объявлений типа ${type}: ${data?.length || 0} из ${count || 'неизвестно'}`);
      return result;
    } catch (error) {
      Logger.error(`Ошибка при получении объявлений типа ${type}:`, error);
      return { data: [], totalCount: 0, hasMore: false };
    } finally {
      activeRequests[requestKey] = false;
    }
  },

  async toggleFavorite(propertyId: string) {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session?.user) {
      throw new Error('Пользователь не авторизован');
    }

    // Проверяем, есть ли уже запись избранного
    const { data: existingFavorite, error: findError } = await supabase
      .from('favorites')
      .select()
      .eq('user_id', session.session.user.id)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (findError) throw findError;

    if (existingFavorite) {
      // Если запись уже есть, удаляем её (удаляем из избранного)
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existingFavorite.id);

      if (deleteError) throw deleteError;
      return false; // Возвращаем false, объект убран из избранного
    } else {
      // Если записи нет, создаём её (добавляем в избранное)
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: session.session.user.id,
          property_id: propertyId
        });

      if (insertError) throw insertError;
      return true; // Возвращаем true, объект добавлен в избранное
    }
  },

  async getFavorites() {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) throw new Error('Пользователь не авторизован');
    
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        property_id,
        property:properties(
          *,
          user:users(name, phone, is_agency),
          city:cities(name),
          district:districts(id, name, city_id),
          agency:agency_profiles(id, name, phone, logo_url, description)
        )
      `)
      .eq('user_id', user.user.id);
    
    if (error) {
      Logger.error('Ошибка при получении избранных объявлений:', error);
      throw error;
    }
    
    return data.map((item: any) => item.property);
  },

  async updateProperty(id: string, propertyData: Partial<PropertyInsert>) {
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }
      
      // Проверяем, является ли пользователь владельцем объявления
      const { data: property, error: checkError } = await supabase
        .from('properties')
        .select('user_id, property_type')
        .eq('id', id)
        .single();
      
      if (checkError) throw checkError;
      
      // Если текущий пользователь не владелец объявления
      if (!property || property.user_id !== user.id) {
        Logger.error('Отказано в доступе: пользователь не является владельцем объявления');
        return { success: false, error: 'Отказано в доступе: вы не являетесь владельцем этого объявления' };
      }
      
      // Продолжаем обновление, если проверка пройдена
      const normalizedPropertyData: Partial<PropertyInsert> = {
        ...propertyData,
        rooms: normalizePropertyRooms(propertyData.property_type ?? property.property_type, propertyData.rooms) ?? 0,
      };

      const { data, error } = await supabase
        .from('properties')
        .update(normalizedPropertyData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // Инвалидируем кэш после успешного обновления
      // Инвалидируем как общие списки, так и кэш детальной информации об объявлении
      invalidateCache(undefined, id);
      
      Logger.debug('Объявление успешно обновлено:', data[0]);
      return { success: true, data: data[0] };
    } catch (error) {
      Logger.error('Ошибка при обновлении объявления:', error);
      return { success: false, error };
    }
  },
  
  async getDistricts(cityId: number) {
    const DISTRICTS_CACHE_TTL = 3 * 60 * 60 * 1000;
    const cacheKey = `domgo_districts_${cityId}`;
    const now = Date.now();

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (now - parsed.timestamp < DISTRICTS_CACHE_TTL && Array.isArray(parsed.data)) {
          Logger.debug('Возвращаем кэшированный список районов', { cityId });
          return parsed.data;
        }
      }

      Logger.debug('Загружаем районы из Supabase', { cityId });
      const { data, error } = await supabase
        .from('districts')
        .select('id, name, city_id, is_active, sort_order, latitude, longitude')
        .eq('city_id', cityId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name');

      if (error) {
        Logger.error('Ошибка при получении районов:', error);
        throw error;
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: now }));
      return data || [];
    } catch (error) {
      Logger.error('Ошибка при работе с кэшем районов:', error);
      const { data, error: fetchError } = await supabase
        .from('districts')
        .select('id, name, city_id, is_active, sort_order, latitude, longitude')
        .eq('city_id', cityId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name');

      if (fetchError) {
        Logger.error('Ошибка при повторном получении районов:', fetchError);
        throw fetchError;
      }

      return data || [];
    }
  },
  
  async getCities() {
    // Время жизни кэша - 3 часа
    const CITIES_CACHE_TTL = 3 * 60 * 60 * 1000;
    const CITIES_CACHE_KEY = 'domgo_cities_cache';
    const now = Date.now();
    
    // Проверяем кэш
    try {
      const cachedData = await AsyncStorage.getItem(CITIES_CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (now - timestamp < CITIES_CACHE_TTL) {
          Logger.debug('Возвращаем кэшированный список городов');
          return data;
        }
      }
      
      // Если кэш отсутствует или устарел, загружаем данные и обновляем кэш
      Logger.debug('Загружаем актуальный список городов');
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');
      
      if (error) {
        Logger.error('Ошибка при получении списка городов:', error);
        throw error;
      }
      
      // Сохраняем в кэш
      await AsyncStorage.setItem(CITIES_CACHE_KEY, JSON.stringify({
        data,
        timestamp: now
      }));
      
      return data;
    } catch (e) {
      Logger.error('Ошибка при работе с кэшем городов:', e);
      
      // В случае ошибки пытаемся загрузить данные напрямую
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name');
      
      if (error) {
        Logger.error('Ошибка при получении списка городов:', error);
        throw error;
      }
      
      return data;
    }
  },
  
  async uploadImage(uri: string, fileName: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      Logger.debug('Загрузка изображения...');
      Logger.debug('Исходный URI:', uri);
      
      // Нормализуем URI для совместимости с iOS и Android
      const normalizedUri = Platform.OS === 'ios' 
        ? uri.replace('file://', '') 
        : uri;
      
      Logger.debug('Нормализованный URI:', normalizedUri);
      
      // Определяем тип файла из расширения и валидируем
      const extFromName = fileName.split('.').pop()?.toLowerCase() ?? '';
      const fileExt = ensureAllowedExtension(extFromName);
      const mimeType = fileExt === 'jpg' || fileExt === 'jpeg'
        ? 'image/jpeg'
        : `image/${fileExt}`;
      
      Logger.debug('Тип файла:', mimeType);
      
      // Сжимаем изображение перед загрузкой
      const compressed = await compressImage(normalizedUri, 0.3);
      Logger.debug('Сжатое изображение URI:', compressed.uri);

      const uniqueFileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = buildPropertyImagePath(user.id, uniqueFileName);
      Logger.debug('Путь:', filePath);

      // Читаем файл как base64 вместо использования fetch
      const base64 = await FileSystem.readAsStringAsync(compressed.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Logger.debug('Файл прочитан как base64, размер:', base64.length);

      // Конвертируем base64 в ArrayBuffer
      const imagePayload = extractBase64Payload(base64);
      const decodedForSize = Buffer.from(imagePayload, 'base64');
      ensureFileNotTooLarge(decodedForSize.byteLength, 'Изображение');
      const arrayBuffer = decode(imagePayload);
      Logger.debug('Конвертирован в ArrayBuffer');

      // Загружаем в Supabase Storage
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: true
        });
      
      if (error) {
        Logger.error('Ошибка загрузки в Supabase:', error);
        throw error;
      }
      
      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);
      
      Logger.debug('Успешно загружено, URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      Logger.error('Ошибка при загрузке изображения:', error);
      throw error;
    }
  },
  
  async uploadImageBase64(base64Data: string, fileExt: string) {
    try {
      // Проверяем авторизацию
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      // Создаем уникальное имя файла
      const normalizedExt = ensureAllowedExtension(fileExt);
      const uniqueFileName = `${Math.random().toString(36).substring(2)}.${normalizedExt}`;
      const filePath = buildPropertyImagePath(user.id, uniqueFileName);

      Logger.debug('Загрузка изображения base64...');
      Logger.debug('Путь:', filePath);
      
      // Проверяем формат base64
      if (!base64Data) {
        throw new Error('Пустые данные base64');
      }
      
      // Преобразуем base64 в Uint8Array для Supabase
      const base64Str = extractBase64Payload(base64Data);

      if (!base64Str) {
        throw new Error('Некорректный формат base64');
      }

      try {
        const decoded = Buffer.from(base64Str, 'base64');
        ensureFileNotTooLarge(decoded.byteLength, 'Изображение base64');
        Logger.debug('Размер декодированных данных:', decoded.length, 'байт');

        // Загружаем в Supabase Storage
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, decoded, {
            contentType: `image/${normalizedExt === 'jpg' ? 'jpeg' : normalizedExt}`,
            upsert: true
          });
        
        if (error) {
          Logger.error('Ошибка загрузки в Supabase:', error);
          throw error;
        }
        
        // Получаем публичный URL
        const { data } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);
        
        Logger.debug('Успешно загружено, URL:', data.publicUrl);
        return data.publicUrl;
      } catch (decodeError) {
        Logger.error('Ошибка при декодировании или загрузке base64:', decodeError);
        throw decodeError;
      }
    } catch (error) {
      Logger.error('Ошибка при загрузке изображения base64:', error);
      throw error;
    }
  },

  async uploadSimple(fileBase64: string, fileName: string) {
    try {
      // Базовая проверка авторизации
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');
      
      // Генерируем имя файла как в веб-версии
      const fileExt = ensureAllowedExtension(fileName.split('.').pop() || '');
      const uniqueFileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = buildPropertyImagePath(user.id, uniqueFileName);

      Logger.debug('Загрузка через простой метод...');
      Logger.debug('Путь:', filePath);

      // Для base64 нельзя использовать прямое сжатие через react-native-image-manipulator
      // Можно сначала декодировать base64, затем сжать и снова закодировать,
      // но это сложно и может вызвать ошибки

      // Подготавливаем данные: выделяем payload и проверяем размер
      const base64Payload = extractBase64Payload(fileBase64);
      const decoded = Buffer.from(base64Payload, 'base64');
      ensureFileNotTooLarge(decoded.byteLength, 'Изображение base64');

      // Загружаем файл напрямую
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, decoded, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true
        });
      
      if (error) {
        Logger.error('Ошибка загрузки в Supabase:', error);
        throw error;
      }
      
      // Получаем публичный URL
      const { data } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);
      
      Logger.debug('Успешно загружено, URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      Logger.error('Ошибка при загрузке изображения:', error);
      throw error;
    }
  }
};

function decode(base64: string): ArrayBuffer {
  // Используем Buffer для декодирования base64 в React Native
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}
