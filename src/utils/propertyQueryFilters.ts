/**
 * Серверные фильтры для запросов списка объявлений (mobile).
 *
 * Применяются на уровне Supabase-запроса (как .eq('type', 'sale')),
 * чтобы при пагинации (loadMore) следующая страница приходила уже отфильтрованной,
 * а не склеивалась с неотфильтрованным «хвостом».
 *
 * Аналог web/lib/property-listings.ts:83-85, изолированный для mobile.
 * Локальная фильтрация в filterHelpers.ts остаётся как безвредный дубль (двойная проверка).
 */

// Фильтры, которые уходят на сервер в SQL-запрос.
// Все поля опциональны: отсутствие = нет фильтра по этому полю.
export interface PropertyQueryFilters {
  // Категория недвижимости: 'apartment' | 'house' | 'commercial' | 'land'.
  // Значение 'all' здесь НЕ передаём (нормализуется в undefined до вызова).
  propertyType?: string;
  cityId?: number | null;
  districtId?: string | null;
}

// Минимальный контракт цепочечного query-билдера Supabase.
// Нам нужен только метод .eq(column, value), возвращающий тот же билдер.
type EqChainable = {
  eq: (column: string, value: string | number | boolean) => EqChainable;
};

// Нормализация: убираем falsy и некорректные значения, 'all' для категории.
const normalizeFilters = (filters?: PropertyQueryFilters): PropertyQueryFilters => {
  if (!filters) {
    return {};
  }

  const normalized: PropertyQueryFilters = {};

  // Категория: принимаем только конкретные значения, не 'all' и не пустое
  if (filters.propertyType && filters.propertyType !== 'all') {
    normalized.propertyType = filters.propertyType;
  }

  // Город: только валидное число
  if (typeof filters.cityId === 'number' && Number.isFinite(filters.cityId)) {
    normalized.cityId = filters.cityId;
  }

  // Район: только непустая строка
  if (typeof filters.districtId === 'string' && filters.districtId.trim() !== '') {
    normalized.districtId = filters.districtId;
  }

  return normalized;
};

/**
 * Применяет фильтры к Supabase-query, возвращая тот же query (chainable).
 * Безопасен: пропускает falsy/'all' значения, мутирует только цепочку вызовов.
 *
 * @example
 *   let query = supabase.from('properties').select('*', { count: 'exact' });
 *   query = applyPropertyQueryFilters(query, { propertyType: 'house', cityId: 5 });
 *   // → query теперь содержит .eq('property_type', 'house').eq('city_id', 5)
 */
export const applyPropertyQueryFilters = <T extends EqChainable>(
  query: T,
  filters?: PropertyQueryFilters
): T => {
  const normalized = normalizeFilters(filters);

  if (normalized.propertyType) {
    query = query.eq('property_type', normalized.propertyType) as T;
  }
  if (typeof normalized.cityId === 'number') {
    query = query.eq('city_id', normalized.cityId) as T;
  }
  if (normalized.districtId) {
    query = query.eq('district_id', normalized.districtId) as T;
  }

  return query;
};

/**
 * Стабильный ключ кэша из фильтров.
 * Используется в propertyService для построения составного cacheKey,
 * чтобы разные наборы фильтров не коллизировали в кэше.
 *
 * @returns например "pt:house|c:5|d:abc" или "none" при отсутствии фильтров.
 */
export const buildFiltersCacheKey = (filters?: PropertyQueryFilters): string => {
  const normalized = normalizeFilters(filters);

  const parts: string[] = [];
  if (normalized.propertyType) parts.push(`pt:${normalized.propertyType}`);
  if (typeof normalized.cityId === 'number') parts.push(`c:${normalized.cityId}`);
  if (normalized.districtId) parts.push(`d:${normalized.districtId}`);

  return parts.length > 0 ? parts.join('|') : 'none';
};
