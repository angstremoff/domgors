export const propertyTypeSupportsRooms = (propertyType: string | null | undefined) => {
  return propertyType !== 'land';
};

// Новостройки доступны только для объявлений о продаже, не для аренды
export const dealTypeSupportsNewBuilding = (dealType: string | null | undefined): boolean => {
  return dealType === 'sale';
};

// Нормализация флага новостройки: для аренды всегда false,
// чтобы не допустить запись type='rent' AND is_new_building=true
export const normalizeNewBuilding = (
  dealType: string | null | undefined,
  value: boolean | null | undefined
): boolean => {
  return dealTypeSupportsNewBuilding(dealType) ? Boolean(value) : false;
};

export const parseFiniteNumberInput = (value: string | number | null | undefined) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizePropertyRooms = (
  propertyType: string | null | undefined,
  rooms: string | number | null | undefined
) => {
  if (!propertyTypeSupportsRooms(propertyType)) {
    return 0;
  }

  const parsed = parseFiniteNumberInput(rooms);
  if (parsed === null || parsed <= 0) {
    return null;
  }

  return parsed;
};
