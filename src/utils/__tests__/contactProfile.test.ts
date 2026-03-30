import { describe, expect, it } from 'vitest';
import {
  buildContactProfileUpsert,
  getContactProfileValidationError,
  normalizeContactProfile,
} from '../contactProfile';

describe('contactProfile helpers', () => {
  it('normalizes nullable profile data into editable strings', () => {
    expect(
      normalizeContactProfile({
        name: '  Ivan  ',
        phone: null,
        email: '',
        avatar_url: null,
      }, 'owner@example.com')
    ).toEqual({
      name: 'Ivan',
      phone: '',
      email: 'owner@example.com',
      avatar_url: null,
    });
  });

  it('validates required contact fields', () => {
    expect(getContactProfileValidationError({ name: '', phone: '+381600000000' })).toBe('name');
    expect(getContactProfileValidationError({ name: 'Ivan', phone: '   ' })).toBe('phone');
    expect(getContactProfileValidationError({ name: 'Ivan', phone: '+381600000000' })).toBeNull();
  });

  it('builds a trimmed upsert payload without touching created_at', () => {
    expect(
      buildContactProfileUpsert({
        userId: 'user-1',
        email: ' seller@example.com ',
        profile: {
          name: '  Ivan  ',
          phone: ' +381600000000 ',
        },
      })
    ).toEqual({
      id: 'user-1',
      email: 'seller@example.com',
      name: 'Ivan',
      phone: '+381600000000',
    });
  });
});
