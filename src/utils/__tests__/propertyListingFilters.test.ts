import { describe, expect, it } from 'vitest';
import {
  applyCityFilterChange,
  applyDistrictFilterChange,
  applyPropertyTypeFilterChange,
  getRoomsFilterQuery,
  getSelectedCityIdFromFilters,
  parsePropertyListingNumberInput,
  resetPropertyListingFilters,
  sanitizePropertyListingFilters,
} from '../propertyListingFilters';

describe('propertyListingFilters helpers', () => {
  it('resets district when city changes and clears city on "all cities"', () => {
    const initialFilters = {
      cityId: '1',
      districtId: 'district-1',
      minPrice: 500,
    };

    expect(applyCityFilterChange(initialFilters, '2')).toEqual({
      cityId: '2',
      districtId: undefined,
      minPrice: 500,
      propertyType: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      rooms: undefined,
    });

    expect(applyCityFilterChange(initialFilters, '')).toEqual({
      cityId: undefined,
      districtId: undefined,
      minPrice: 500,
      propertyType: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      rooms: undefined,
    });
  });

  it('applies and clears district independently', () => {
    const initialFilters = {
      cityId: '1',
      districtId: 'district-1',
      propertyType: 'apartment',
    };

    expect(applyDistrictFilterChange(initialFilters, 'district-2')).toEqual({
      cityId: '1',
      districtId: 'district-2',
      propertyType: 'apartment',
      minPrice: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      rooms: undefined,
    });

    expect(applyDistrictFilterChange(initialFilters, '')).toEqual({
      cityId: '1',
      districtId: undefined,
      propertyType: 'apartment',
      minPrice: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      rooms: undefined,
    });
  });

  it('drops rooms when property type becomes land', () => {
    expect(applyPropertyTypeFilterChange({
      propertyType: 'apartment',
      rooms: 3,
      cityId: '1',
    }, 'land')).toEqual({
      propertyType: 'land',
      rooms: undefined,
      cityId: '1',
      districtId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
    });
  });

  it('preserves numeric zero values and normalizes empty strings', () => {
    expect(sanitizePropertyListingFilters({
      propertyType: '',
      cityId: '',
      districtId: '',
      minPrice: 0,
      maxPrice: 0,
      minArea: 0,
      maxArea: 0,
      rooms: 0,
    })).toEqual({
      propertyType: undefined,
      cityId: undefined,
      districtId: undefined,
      minPrice: 0,
      maxPrice: 0,
      minArea: 0,
      maxArea: 0,
      rooms: 0,
    });
  });

  it('parses number inputs and resets cleanly', () => {
    expect(parsePropertyListingNumberInput('')).toBeUndefined();
    expect(parsePropertyListingNumberInput('0')).toBe(0);
    expect(parsePropertyListingNumberInput('150')).toBe(150);
    expect(resetPropertyListingFilters()).toEqual({});
  });

  it('derives selected city id and room query semantics correctly', () => {
    expect(getSelectedCityIdFromFilters({ cityId: '11' })).toBe(11);
    expect(getSelectedCityIdFromFilters({ cityId: undefined })).toBeUndefined();
    expect(getRoomsFilterQuery(undefined, 'apartment')).toBeNull();
    expect(getRoomsFilterQuery(3, 'land')).toBeNull();
    expect(getRoomsFilterQuery(3, 'apartment')).toEqual({ operator: 'eq', value: 3 });
    expect(getRoomsFilterQuery(5, 'apartment')).toEqual({ operator: 'gte', value: 5 });
    expect(getRoomsFilterQuery(7, 'house')).toEqual({ operator: 'gte', value: 5 });
  });
});
