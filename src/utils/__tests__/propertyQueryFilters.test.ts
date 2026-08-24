import { describe, expect, it } from 'vitest';
import {
  applyPropertyQueryFilters,
  buildFiltersCacheKey,
  type PropertyQueryFilters,
} from '../propertyQueryFilters';

// Мок цепочечного query-билдера: записывает все вызовы .eq(column, value)
type EqCall = { column: string; value: string | number | boolean };

// Тип самоссылающегося chainable мока
type MockQuery = { eq: (column: string, value: string | number | boolean) => MockQuery };

const createMockQuery = () => {
  const calls: EqCall[] = [];
  const mock: MockQuery = {
    eq(column: string, value: string | number | boolean) {
      calls.push({ column, value });
      return mock; // chainable
    },
  };
  return { mock, calls };
};

describe('propertyQueryFilters helpers', () => {
  describe('applyPropertyQueryFilters', () => {
    it('применяет все три фильтра, когда они валидны', () => {
      const { mock, calls } = createMockQuery();
      const result = applyPropertyQueryFilters(mock, {
        propertyType: 'house',
        cityId: 5,
        districtId: 'abc-123',
      });

      expect(result).toBe(mock); // возвращает тот же query
      expect(calls).toEqual([
        { column: 'property_type', value: 'house' },
        { column: 'city_id', value: 5 },
        { column: 'district_id', value: 'abc-123' },
      ]);
    });

    it('не вызывает .eq при отсутствии фильтров', () => {
      const { mock, calls } = createMockQuery();
      const result = applyPropertyQueryFilters(mock);

      expect(result).toBe(mock);
      expect(calls).toEqual([]);
    });

    it('не вызывает .eq при пустом объекте фильтров', () => {
      const { mock, calls } = createMockQuery();
      applyPropertyQueryFilters(mock, {});

      expect(calls).toEqual([]);
    });

    it('нормализует "all" для категории (не применяет)', () => {
      const { mock, calls } = createMockQuery();
      applyPropertyQueryFilters(mock, { propertyType: 'all', cityId: 7 });

      expect(calls).toEqual([{ column: 'city_id', value: 7 }]);
    });

    it('игнорирует falsy значения', () => {
      const { mock, calls } = createMockQuery();
      applyPropertyQueryFilters(mock, {
        propertyType: '',
        cityId: null,
        districtId: '',
      });

      expect(calls).toEqual([]);
    });

    it('игнорирует NaN для cityId', () => {
      const { mock, calls } = createMockQuery();
      applyPropertyQueryFilters(mock, { cityId: NaN });

      expect(calls).toEqual([]);
    });

    it('игнорирует пробельные строки для districtId', () => {
      const { mock, calls } = createMockQuery();
      applyPropertyQueryFilters(mock, { districtId: '   ' });

      expect(calls).toEqual([]);
    });

    it('применяет только category, если передан только он', () => {
      const { mock, calls } = createMockQuery();
      applyPropertyQueryFilters(mock, { propertyType: 'apartment' });

      expect(calls).toEqual([{ column: 'property_type', value: 'apartment' }]);
    });

    it('сохраняет цепочку: последовательно наращивает .eq', () => {
      const { mock, calls } = createMockQuery();
      // Имитация порядка в propertyService: .eq('type', ...) уже вызван ранее,
      // теперь applyPropertyQueryFilters добавляет свои условия
      const chained = mock.eq('type', 'sale');
      applyPropertyQueryFilters(chained, { propertyType: 'land', cityId: 2 });

      expect(calls).toEqual([
        { column: 'type', value: 'sale' },
        { column: 'property_type', value: 'land' },
        { column: 'city_id', value: 2 },
      ]);
    });
  });

  describe('buildFiltersCacheKey', () => {
    it('возвращает "none" при отсутствии фильтров', () => {
      expect(buildFiltersCacheKey()).toBe('none');
      expect(buildFiltersCacheKey({})).toBe('none');
    });

    it('формирует ключ со всеми компонентами', () => {
      const key = buildFiltersCacheKey({
        propertyType: 'house',
        cityId: 5,
        districtId: 'abc',
      });
      expect(key).toBe('pt:house|c:5|d:abc');
    });

    it('нормализует "all" (как отсутствие категории)', () => {
      expect(buildFiltersCacheKey({ propertyType: 'all' })).toBe('none');
    });

    it('игнорирует falsy значения', () => {
      expect(buildFiltersCacheKey({ propertyType: '', cityId: null })).toBe('none');
      expect(buildFiltersCacheKey({ cityId: 3 })).toBe('c:3');
    });

    it('стабилен: одинаковые фильтры → одинаковый ключ', () => {
      const a: PropertyQueryFilters = { propertyType: 'house', cityId: 5 };
      const b: PropertyQueryFilters = { cityId: 5, propertyType: 'house' };
      expect(buildFiltersCacheKey(a)).toBe(buildFiltersCacheKey(b));
    });

    it('различает разные фильтры', () => {
      expect(buildFiltersCacheKey({ propertyType: 'house' })).not.toBe(
        buildFiltersCacheKey({ propertyType: 'apartment' })
      );
    });
  });
});
