export type AuthFlowType =
  | 'signup'
  | 'recovery'
  | 'magiclink'
  | 'invite'
  | 'email_change'
  | 'unknown';

export interface AuthSessionLinkData {
  accessToken: string;
  refreshToken: string;
  authType: AuthFlowType | null;
}

const DOMGO_WEB_ORIGIN = 'https://domgo.rs';
const MOBILE_AUTH_CALLBACK_URL = 'domgomobile://auth/callback';

function normalizeOrigin(origin: string) {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

function normalizeAuthType(value: string | null): AuthFlowType | null {
  if (!value) {
    return null;
  }

  switch (value) {
    case 'signup':
    case 'recovery':
    case 'magiclink':
    case 'invite':
    case 'email_change':
      return value;
    default:
      return 'unknown';
  }
}

function getCombinedParams(url: string) {
  const parsedUrl = new URL(url);
  const combinedParams = new URLSearchParams(parsedUrl.search);
  const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  const hashParams = new URLSearchParams(hash);

  hashParams.forEach((value, key) => {
    combinedParams.set(key, value);
  });

  return combinedParams;
}

export function extractAuthSessionLinkData(url: string): AuthSessionLinkData | null {
  try {
    const params = getCombinedParams(url);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      authType: normalizeAuthType(params.get('type')),
    };
  } catch {
    return null;
  }
}

export function resolveWebAppOrigin(origin?: string) {
  if (origin) {
    return normalizeOrigin(origin);
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return normalizeOrigin(window.location.origin);
  }

  return DOMGO_WEB_ORIGIN;
}

export function buildWebAuthCallbackUrl(origin?: string) {
  return `${resolveWebAppOrigin(origin)}/auth/callback/`;
}

export function buildWebResetPasswordUrl(origin?: string) {
  return `${resolveWebAppOrigin(origin)}/auth/reset-password/`;
}

export function buildMobileAuthCallbackUrl(data: AuthSessionLinkData) {
  const params = new URLSearchParams({
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
  });

  if (data.authType) {
    params.set('type', data.authType);
  }

  return `${MOBILE_AUTH_CALLBACK_URL}?${params.toString()}`;
}
