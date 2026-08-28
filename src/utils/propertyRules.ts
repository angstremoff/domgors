export const propertyTypeSupportsRooms = (propertyType: string | null | undefined) => {
  return propertyType !== 'land';
};

// Новостройки доступны только для объявлений о продаже, не для аренды
export const dealTypeSupportsNewBuilding = (dealType: string | null | undefined): boolean => {
  return dealType === 'sale';
};

// Возраст «свежести» объявления для бейджа «Новое»
export const FRESH_LISTING_MAX_AGE_DAYS = 7;

// Свежее ли объявление (created_at младше N дней) — для бейджа «Новое» на карточках.
// Безопасно: null/undefined/невалидная дата/false-будущее → false.
export const isFreshListing = (
  createdAt: string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!createdAt) {
    return false;
  }

  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const ageMs = now - timestamp;
  if (ageMs < 0) {
    // Дата в будущем — считаем некорректной, не показываем бейдж
    return false;
  }

  return ageMs <= FRESH_LISTING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
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
