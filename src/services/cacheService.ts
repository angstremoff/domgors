/**
 * Сервис для кеширования данных с поддержкой TTL (Time To Live)
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache: Record<string, CacheItem<any>> = {};
  
  /**
   * Получить данные из кеша
   * @param key Ключ кеша
   * @param ttl Время жизни кеша в миллисекундах (по умолчанию 5 минут)
   * @returns Кешированные данные или null, если данные устарели или отсутствуют
   */
  get<T>(key: string, ttl: number = 300000): T | null {
    const now = Date.now();
    const cachedItem = this.cache[key];
    
    if (cachedItem && now - cachedItem.timestamp < ttl) {
      return cachedItem.data;
    }
    
    return null;
  }
  
  /**
   * Сохранить данные в кеш
   * @param key Ключ кеша
   * @param data Данные для кеширования
   */
  set<T>(key: string, data: T): void {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }
  
  /**
   * Удалить данные из кеша
   * @param key Ключ кеша
   */
  remove(key: string): void {
    if (this.cache[key]) {
      delete this.cache[key];
    }
  }
  
  /**
   * Очистить весь кеш
   */
  clear(): void {
    this.cache = {};
  }
  
  /**
   * Проверить, содержится ли ключ в кеше
   * @param key Ключ кеша
   * @returns true, если ключ в кеше существует
   */
  has(key: string): boolean {
    return !!this.cache[key];
  }
  
  /**
   * Получить размер кеша (количество ключей)
   */
  size(): number {
    return Object.keys(this.cache).length;
  }
}

// Создаем синглтон для использования во всем приложении
const cacheService = new CacheService();
export default cacheService;
