export const propertyTypeSupportsRooms = (propertyType: string | null | undefined) => {
  return propertyType !== 'land';
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
