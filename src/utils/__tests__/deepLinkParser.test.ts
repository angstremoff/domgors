import { describe, expect, it } from 'vitest';
import { parseDeepLink } from '../deepLinkParser';

describe('parseDeepLink', () => {
  const testId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('parses auth callback with tokens', () => {
    const url =
      'domgomobile://auth/callback?access_token=abc123&refresh_token=ref456&type=signup';
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({
      type: 'auth',
      accessToken: 'abc123',
      refreshToken: 'ref456',
      raw: url,
    });
  });

  it('parses native property path', () => {
    const url = `domgomobile://property/${testId}`;
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({ type: 'property', propertyId: testId, raw: url });
  });

  it('parses native property query', () => {
    const url = `domgomobile://property?id=${testId}`;
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({ type: 'property', propertyId: testId, raw: url });
  });

  it('parses web property link', () => {
    const url = `https://domgo.rs/property/${testId}`;
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({ type: 'property', propertyId: testId, raw: url });
  });

  it('parses domgo.rs handler page', () => {
    const url = `https://domgo.rs/property.html?id=${testId}`;
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({ type: 'property', propertyId: testId, raw: url });
  });

  it('parses legacy GitHub pages handler', () => {
    const url = `https://angstremoff.github.io/domgomobile/property.html?id=${testId}`;
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({ type: 'property', propertyId: testId, raw: url });
  });

  it('returns unknown for unsupported link', () => {
    const url = 'https://example.com/test';
    const parsed = parseDeepLink(url);
    expect(parsed).toEqual({ type: 'unknown', raw: url });
  });
});
