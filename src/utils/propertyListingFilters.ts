export interface PropertyListingFilterState {
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  rooms?: number;
  cityId?: string;
  districtId?: string;
}

export interface RoomsFilterQuery {
  operator: 'eq' | 'gte';
  value: number;
}

export function sanitizePropertyListingFilters(
  filters: PropertyListingFilterState
): PropertyListingFilterState {
  const nextFilters: PropertyListingFilterState = {
    propertyType: filters.propertyType || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minArea: filters.minArea,
    maxArea: filters.maxArea,
    rooms: filters.rooms,
    cityId: filters.cityId || undefined,
    districtId: filters.districtId || undefined,
  };

  if (nextFilters.propertyType === 'land') {
    nextFilters.rooms = undefined;
  }

  return nextFilters;
}

export function resetPropertyListingFilters(): PropertyListingFilterState {
  return {};
}

export function applyCityFilterChange(
  currentFilters: PropertyListingFilterState,
  cityId: string
): PropertyListingFilterState {
  return sanitizePropertyListingFilters({
    ...currentFilters,
    cityId: cityId || undefined,
    districtId: undefined,
  });
}

export function applyDistrictFilterChange(
  currentFilters: PropertyListingFilterState,
  districtId: string
): PropertyListingFilterState {
  return sanitizePropertyListingFilters({
    ...currentFilters,
    districtId: districtId || undefined,
  });
}

export function applyPropertyTypeFilterChange(
  currentFilters: PropertyListingFilterState,
  propertyType: string
): PropertyListingFilterState {
  return sanitizePropertyListingFilters({
    ...currentFilters,
    propertyType: propertyType || undefined,
  });
}

export function parsePropertyListingNumberInput(value: string): number | undefined {
  if (value === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getSelectedCityIdFromFilters(
  filters: PropertyListingFilterState
): number | undefined {
  if (!filters.cityId) {
    return undefined;
  }

  const parsed = Number(filters.cityId);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getRoomsFilterQuery(
  rooms: number | undefined,
  propertyType: string | undefined
): RoomsFilterQuery | null {
  if (rooms === undefined || propertyType === 'land') {
    return null;
  }

  if (rooms >= 5) {
    return {
      operator: 'gte',
      value: 5,
    };
  }

  return {
    operator: 'eq',
    value: rooms,
  };
}
