import { describe, expect, it } from 'vitest';
import {
  dealTypeSupportsNewBuilding,
  FRESH_LISTING_MAX_AGE_DAYS,
  isFreshListing,
  normalizeNewBuilding,
  normalizePropertyRooms,
  parseFiniteNumberInput,
  propertyTypeSupportsRooms,
} from '../propertyRules';

describe('propertyRules helpers', () => {
  describe('propertyTypeSupportsRooms', () => {
    it('возвращает false только для land', () => {
      expect(propertyTypeSupportsRooms('land')).toBe(false);
    });

    it('возвращает true для остальных типов', () => {
      expect(propertyTypeSupportsRooms('apartment')).toBe(true);
      expect(propertyTypeSupportsRooms('house')).toBe(true);
      expect(propertyTypeSupportsRooms('commercial')).toBe(true);
    });

    it('обрабатывает пустые значения', () => {
      expect(propertyTypeSupportsRooms(null)).toBe(true);
      expect(propertyTypeSupportsRooms(undefined)).toBe(true);
      expect(propertyTypeSupportsRooms('')).toBe(true);
    });
  });

  describe('parseFiniteNumberInput', () => {
    it('парсит валидные числовые строки', () => {
      expect(parseFiniteNumberInput('42')).toBe(42);
      expect(parseFiniteNumberInput('  3.5  ')).toBe(3.5);
      expect(parseFiniteNumberInput(10)).toBe(10);
    });

    it('возвращает null для невалидных значений', () => {
      expect(parseFiniteNumberInput('abc')).toBeNull();
      expect(parseFiniteNumberInput('')).toBeNull();
      expect(parseFiniteNumberInput(null)).toBeNull();
      expect(parseFiniteNumberInput(undefined)).toBeNull();
    });
  });

  describe('normalizePropertyRooms', () => {
    it('возвращает 0 для land (комнаты не требуются)', () => {
      expect(normalizePropertyRooms('land', '5')).toBe(0);
    });

    it('возвращает распарсенное число для прочих типов', () => {
      expect(normalizePropertyRooms('apartment', '3')).toBe(3);
      expect(normalizePropertyRooms('house', 4)).toBe(4);
    });

    it('возвращает null для неположительных значений', () => {
      expect(normalizePropertyRooms('apartment', '0')).toBeNull();
      expect(normalizePropertyRooms('apartment', '-1')).toBeNull();
    });
  });

  describe('dealTypeSupportsNewBuilding', () => {
    it('возвращает true только для продажи', () => {
      expect(dealTypeSupportsNewBuilding('sale')).toBe(true);
    });

    it('возвращает false для аренды', () => {
      expect(dealTypeSupportsNewBuilding('rent')).toBe(false);
    });

    it('возвращает false для пустых и неизвестных значений', () => {
      expect(dealTypeSupportsNewBuilding(null)).toBe(false);
      expect(dealTypeSupportsNewBuilding(undefined)).toBe(false);
      expect(dealTypeSupportsNewBuilding('')).toBe(false);
      expect(dealTypeSupportsNewBuilding('newBuildings')).toBe(false);
    });
  });

  describe('normalizeNewBuilding', () => {
    it('сохраняет значение для продажи', () => {
      expect(normalizeNewBuilding('sale', true)).toBe(true);
      expect(normalizeNewBuilding('sale', false)).toBe(false);
    });

    it('всегда возвращает false для аренды (защита инварианта)', () => {
      expect(normalizeNewBuilding('rent', true)).toBe(false);
      expect(normalizeNewBuilding('rent', false)).toBe(false);
    });

    it('приводит nullish к false даже для продажи', () => {
      expect(normalizeNewBuilding('sale', null)).toBe(false);
      expect(normalizeNewBuilding('sale', undefined)).toBe(false);
    });

    it('обрабатывает некорректный тип сделки', () => {
      expect(normalizeNewBuilding('unknown', true)).toBe(false);
      expect(normalizeNewBuilding(null, true)).toBe(false);
      expect(normalizeNewBuilding(undefined, true)).toBe(false);
    });
  });

  describe('isFreshListing', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const NOW = Date.parse('2026-07-08T12:00:00Z');

    it('возвращает true для объявления младше 7 дней', () => {
      expect(isFreshListing('2026-07-07T12:00:00Z', NOW)).toBe(true); // 1 день
      expect(isFreshListing('2026-07-05T12:00:00Z', NOW)).toBe(true); // 3 дня
    });

    it('возвращает true ровно на границе 7 дней', () => {
      const exactlySevenDays = new Date(NOW - FRESH_LISTING_MAX_AGE_DAYS * DAY_MS).toISOString();
      expect(isFreshListing(exactlySevenDays, NOW)).toBe(true);
    });

    it('возвращает false для объявления старше 7 дней', () => {
      const eightDays = new Date(NOW - 8 * DAY_MS).toISOString();
      expect(isFreshListing(eightDays, NOW)).toBe(false);
      const monthAgo = new Date(NOW - 30 * DAY_MS).toISOString();
      expect(isFreshListing(monthAgo, NOW)).toBe(false);
    });

    it('возвращает false для null/undefined/пустой строки', () => {
      expect(isFreshListing(null, NOW)).toBe(false);
      expect(isFreshListing(undefined, NOW)).toBe(false);
      expect(isFreshListing('', NOW)).toBe(false);
    });

    it('возвращает false для невалидной даты', () => {
      expect(isFreshListing('not-a-date', NOW)).toBe(false);
      expect(isFreshListing('2026-13-45T99:99:99Z', NOW)).toBe(false);
    });

    it('возвращает false для даты в будущем', () => {
      expect(isFreshListing('2026-07-10T12:00:00Z', NOW)).toBe(false);
    });
  });
});
