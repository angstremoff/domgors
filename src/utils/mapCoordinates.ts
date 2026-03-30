import type { Database, Json } from '../lib/database.types';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

const asFiniteNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseMapCoordinates = (value: unknown): MapCoordinates | null => {
  if (!value) {
    return null;
  }

  let normalized: unknown = value;

  if (typeof value === 'string') {
    try {
      normalized = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }

  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return null;
  }

  const record = normalized as Record<string, unknown>;
  const lat = asFiniteNumber(record.lat);
  const lng = asFiniteNumber(record.lng);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
};

export const getCityMapCoordinates = (
  value: Database['public']['Tables']['cities']['Row']['coordinates'] | Json | null | undefined
) => {
  return parseMapCoordinates(value);
};

export const formatMapCoordinates = (value: MapCoordinates) => {
  return `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`;
};

export const serializeMapCoordinates = (value: MapCoordinates | null): { [key: string]: Json | undefined } | null => {
  if (!value) {
    return null;
  }

  return {
    lat: value.lat,
    lng: value.lng,
  };
};
