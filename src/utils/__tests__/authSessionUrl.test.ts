import { describe, expect, it } from 'vitest';
import { extractAuthCallbackLinkData, extractAuthSessionLinkData } from '../authSessionUrl';

describe('authSessionUrl', () => {
  it('extracts access and refresh tokens from query', () => {
    const url = 'https://domgo.rs/auth/callback/?access_token=abc&refresh_token=ref&type=signup';

    expect(extractAuthSessionLinkData(url)).toEqual({
      accessToken: 'abc',
      refreshToken: 'ref',
      authType: 'signup',
    });
  });

  it('extracts access and refresh tokens from hash', () => {
    const url = 'https://domgo.rs/auth/callback/#access_token=abc&refresh_token=ref&type=recovery';

    expect(extractAuthSessionLinkData(url)).toEqual({
      accessToken: 'abc',
      refreshToken: 'ref',
      authType: 'recovery',
    });
  });

  it('extracts code callback params', () => {
    const url = 'https://domgo.rs/auth/callback/?code=pkce-code&type=email';

    expect(extractAuthCallbackLinkData(url)).toEqual({
      accessToken: null,
      refreshToken: null,
      code: 'pkce-code',
      tokenHash: null,
      authType: 'email',
    });
  });

  it('extracts token hash callback params', () => {
    const url = 'https://domgo.rs/auth/reset-password/?token_hash=hash123&type=recovery';

    expect(extractAuthCallbackLinkData(url)).toEqual({
      accessToken: null,
      refreshToken: null,
      code: null,
      tokenHash: 'hash123',
      authType: 'recovery',
    });
  });
});
