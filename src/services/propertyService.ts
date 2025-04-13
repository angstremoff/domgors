import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'
import cacheService from './cacheService'

// Ключ для кэша недвижимости
const PROPERTIES_CACHE_KEY = 'domgo_properties_cache'
// Время жизни кэша - 10 минут (т.к. данные могут часто обновляться)
const PROPERTIES_CACHE_TTL = 10 * 60 * 1000

type Property = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']

export const propertyService = {
  /**
   * Получение списка недвижимости с поддержкой кэширования и пагинации
   * @param page Номер страницы (начиная с 1)
   * @param limit Количество элементов на странице
   * @param forceRefresh Принудительное обновление кэша
   */
  async getProperties(page = 1, limit = 20, forceRefresh = false) {
    // Создаем уникальный ключ для кеширования, учитывая страницу и лимит
    const memoryCacheKey = `properties_page_${page}_limit_${limit}`;

    // Сначала проверяем in-memory кеш (он быстрее localStorage)
    if (!forceRefresh) {
      const memoryCachedData = cacheService.get<Property[]>(memoryCacheKey);
      if (memoryCachedData) {
        console.log('Загружаем объекты недвижимости из memory-кеша');
        return memoryCachedData;
      }

      // Если это первая страница и не требуется принудительное обновление, проверяем localStorage
      if (page === 1) {
        try {
          const cachedData = localStorage.getItem(PROPERTIES_CACHE_KEY);
          if (cachedData) {
            const { data: properties, timestamp } = JSON.parse(cachedData);
            const now = new Date().getTime();
            
            // Если localStorage кеш актуален, используем его и сохраняем в memory-кеш
            if (now - timestamp < PROPERTIES_CACHE_TTL) {
              console.log('Загружаем объекты недвижимости из localStorage');
              // Сохраняем в memory-кеш для будущих запросов
              cacheService.set(memoryCacheKey, properties);
              return properties;
            }
          }
        } catch (e) {
          console.error('Ошибка при чтении кэша недвижимости:', e);
          // При ошибке удаляем кэш
          localStorage.removeItem(PROPERTIES_CACHE_KEY);
        }
      }
    }
    
    console.log(`Загружаем объекты недвижимости из API (страница ${page}, лимит ${limit})`);
    
    // Рассчитываем смещение для пагинации
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    try {
      // Сначала получаем общее количество
      const countResponse = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });
      
      const totalCount = countResponse.count || 0;
      
      // Проверяем, есть ли данные для запрашиваемой страницы
      if (from >= totalCount) {
        // Если запрашиваемый оффсет больше общего количества, возвращаем пустой массив
        console.log(`Запрошено ${from} записей, но всего доступно ${totalCount}. Возвращаем пустой массив.`);
        return [];
      }
      
      // Если запрос валидный, выполняем его
      const response = await supabase
        .from('properties')
        .select(`
          *,
          user:users(name, phone),
          city:cities(name)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);
  
      if (response.error) {
        console.error('Error fetching properties:', response.error);
        throw response.error;
      }
      
      const resultData = response.data || [];
            
      // Сохраняем данные в memory-кеш, независимо от страницы
      cacheService.set(`properties_page_${page}_limit_${limit}`, resultData);
      
      // Сохраняем первую страницу в localStorage
      if (page === 1) {
        try {
          localStorage.setItem(PROPERTIES_CACHE_KEY, JSON.stringify({
            data: resultData,
            timestamp: new Date().getTime(),
            totalCount: totalCount
          }));
        } catch (e) {
          console.error('Ошибка при сохранении кэша недвижимости в localStorage:', e);
        }
      }
      
      console.log(`Загружено ${resultData.length} объектов, всего: ${totalCount}`);
      return resultData;
    } catch (error: any) {
      // Обрабатываем ошибку PGRST103 (запрошенный диапазон недоступен)
      if (error && error.code === 'PGRST103') {
        console.log('Достигнут конец списка. Возвращаем пустой массив.');
        return [];
      }
      
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  async getProperty(id: string) {
    try {
      // Создаем ключ для memory-кеша
      const cacheKey = `property_${id}`;
      
      // Проверяем memory-кеш
      const cachedProperty = cacheService.get<Property>(cacheKey);
      if (cachedProperty) {
        console.log(`Загружаем объект недвижимости ${id} из memory-кеша`);
        return cachedProperty;
      }
      
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          user:users(name, phone),
          city:cities(name)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      
      // Сохраняем результат в memory-кеш
      cacheService.set(cacheKey, data);
      
      return data
    } catch (error) {
      console.error(`Error fetching property ${id}:`, error)
      throw error
    }
  },

  async createProperty(property: PropertyInsert) {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...property,
        user_id: session.session.user.id
      })
      .select(`
        *,
        user:users(name, phone),
        city:cities(name)
      `)
      .single()

    if (error) throw error
    
    // При создании нового объекта сбрасываем кэш
    try {
      localStorage.removeItem(PROPERTIES_CACHE_KEY);
    } catch (e) {
      console.error('Ошибка при сбросе кэша:', e);
    }
    
    return data
  },

  async updateProperty(id: string, updates: Partial<Property>) {
    try {
      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // При обновлении объекта инвалидируем кеши для этого объекта
      cacheService.remove(`property_${id}`);
      // Инвалидируем кеши списков, так как объект мог измениться
      try {
        localStorage.removeItem(PROPERTIES_CACHE_KEY);
      } catch (e) {
        console.error('Ошибка при сбросе localStorage кеша:', e);
      }

      return { success: true }
    } catch (error) {
      console.error(`Error updating property ${id}:`, error)
      throw error
    }
  },

  async deleteProperty(id: string) {
    try {
      // Сначала получаем данные об объявлении, включая фотографии
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('images')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Если у объявления есть фотографии, удаляем их из хранилища
      if (property && property.images && Array.isArray(property.images) && property.images.length > 0) {
        // Извлекаем пути файлов из полных URL-адресов
        const filePaths = property.images.map(url => {
          // URL имеет вид https://.../storage/v1/object/public/properties/property-images/filename.jpg
          const match = url.match(/\/properties\/(.+)$/)
          return match ? match[1] : null
        }).filter(Boolean)

        // Удаляем файлы из хранилища
        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('properties')
            .remove(filePaths)

          if (storageError) {
            console.error('Error deleting property images:', storageError)
          }
        }
      }

      // Затем удаляем само объявление
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // При удалении объекта сбрасываем все кеши
      try {
        // Очищаем memory-кеш
        cacheService.clear();
        // Очищаем localStorage
        localStorage.removeItem(PROPERTIES_CACHE_KEY);
        console.log('Кеши очищены после удаления объекта');
      } catch (e) {
        console.error('Ошибка при сбросе кешей:', e);
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting property:', error)
      throw error
    }
  },

  async toggleFavorite(propertyId: string) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data: existing, error: fetchError } = await supabase
      .from('favorites')
      .select('id')
      .match({ user_id: user.user.id, property_id: propertyId })
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ id: existing.id })

      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.user.id,
          property_id: propertyId
        })
        .select('id')
        .single()

      if (error) throw error
      return true
    }
  },

  async getUserPropertiesCount(userId: string) {
    const { count, error } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error(`Error counting properties for user ${userId}:`, error)
      throw error
    }

    return count || 0
  },
  
  /**
   * Получение общего количества объектов недвижимости
   * @param forceRefresh Принудительное обновление кэша
   */
  async getTotalCount(forceRefresh = false) {
    const memoryCacheKey = 'properties_total_count';

    // Сначала проверяем memory-кеш
    if (!forceRefresh) {
      const memoryCachedCount = cacheService.get<number>(memoryCacheKey);
      if (memoryCachedCount !== null) {
        console.log('Загружаем количество объектов из memory-кеша');
        return memoryCachedCount;
      }
      
      // Затем проверяем localStorage
      try {
        const cachedData = localStorage.getItem(PROPERTIES_CACHE_KEY);
        if (cachedData) {
          const { totalCount, timestamp } = JSON.parse(cachedData);
          const now = new Date().getTime();
          
          // Если localStorage кеш актуален, используем значение из него
          if (now - timestamp < PROPERTIES_CACHE_TTL && totalCount !== undefined) {
            // Сохраняем в memory-кеш для будущих запросов
            cacheService.set(memoryCacheKey, totalCount);
            return totalCount;
          }
        }
      } catch (e) {
        console.error('Ошибка при чтении кэша недвижимости:', e);
      }
    }
    
    // Если кэша нет или он устарел, получаем количество из базы
    const { count, error } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('Error counting properties:', error)
      throw error
    }

    // Сохраняем результат в memory-кеш
    const totalCount = count || 0;
    cacheService.set('properties_total_count', totalCount);

    return totalCount
  }
}
