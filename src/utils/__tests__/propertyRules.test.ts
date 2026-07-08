import { describe, expect, it } from 'vitest';
import {
  dealTypeSupportsNewBuilding,
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
});
