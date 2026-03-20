import { describe, expect, it } from 'vitest';
import {
  formatAgencySiteUrl,
  formatAgencyTelegramUrl,
  normalizeAgencyProfile,
} from '../agencyProfile';

describe('agencyProfile helpers', () => {
  it('normalizes legacy aliases and keeps real site data', () => {
    const agency = normalizeAgencyProfile({
      id: 'agency-1',
      name: 'DomGo Agency',
      email: 'agency@example.com',
      website: 'domgo.rs',
      address: 'Loznica',
      instagram_url: 'instagram.com/domgo',
      facebook_url: 'facebook.com/domgo',
    });

    expect(agency).toEqual({
      id: 'agency-1',
      user_id: null,
      city_id: null,
      created_at: null,
      name: 'DomGo Agency',
      phone: null,
      logo_url: null,
      description: null,
      email: 'agency@example.com',
      site: 'domgo.rs',
      location: 'Loznica',
      telegram: null,
      instagram: 'instagram.com/domgo',
      facebook: 'facebook.com/domgo',
    });
  });

  it('treats legacy site telegram handles as telegram instead of website', () => {
    const agency = normalizeAgencyProfile({
      id: 'agency-2',
      site: '@domgo_agency',
    });

    expect(agency?.site).toBeNull();
    expect(agency?.telegram).toBe('@domgo_agency');
    expect(formatAgencyTelegramUrl(agency?.telegram)).toBe('https://t.me/domgo_agency');
  });

  it('formats website urls safely', () => {
    expect(formatAgencySiteUrl('domgo.rs')).toBe('https://domgo.rs');
    expect(formatAgencySiteUrl('https://domgo.rs')).toBe('https://domgo.rs');
    expect(formatAgencySiteUrl('')).toBeNull();
  });
});
