import { describe, expect, it } from 'vitest';
import {
  formatMapCoordinates,
  getCityMapCoordinates,
  parseMapCoordinates,
  serializeMapCoordinates,
} from '../mapCoordinates';

describe('mapCoordinates helpers', () => {
  it('parses coordinates from an object with numeric strings', () => {
    expect(parseMapCoordinates({ lat: '44.7866', lng: '20.4489' })).toEqual({
      lat: 44.7866,
      lng: 20.4489,
    });
  });

  it('parses coordinates from a json string', () => {
    expect(parseMapCoordinates('{"lat":44.7866,"lng":20.4489}')).toEqual({
      lat: 44.7866,
      lng: 20.4489,
    });
  });

  it('returns null for invalid coordinate payloads', () => {
    expect(parseMapCoordinates('not-json')).toBeNull();
    expect(parseMapCoordinates({ lat: 'oops', lng: 20.4489 })).toBeNull();
  });

  it('extracts city coordinates and formats them for UI', () => {
    const coordinates = getCityMapCoordinates({ lat: 45.267136, lng: 19.833549 });
    expect(coordinates).toEqual({ lat: 45.267136, lng: 19.833549 });
    expect(formatMapCoordinates(coordinates!)).toBe('45.267136, 19.833549');
  });

  it('serializes coordinates for supabase json fields', () => {
    expect(serializeMapCoordinates({ lat: 44.8, lng: 20.4 })).toEqual({
      lat: 44.8,
      lng: 20.4,
    });
    expect(serializeMapCoordinates(null)).toBeNull();
  });
});
