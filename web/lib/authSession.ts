import { createClient } from '@/lib/supabase/client';
import {
  extractAuthCallbackLinkData,
  type AuthFlowType,
  type AuthSessionLinkData,
} from '@shared/utils/authSessionUrl';

type BrowserSupabaseClient = ReturnType<typeof createClient>;
type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

const wait = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

function resolveOtpType(authType: AuthFlowType | null): EmailOtpType | null {
  switch (authType) {
    case 'signup':
    case 'recovery':
    case 'magiclink':
    case 'invite':
    case 'email_change':
    case 'email':
      return authType;
    default:
      return null;
  }
}

async function getSettledSession(supabase: BrowserSupabaseClient) {
  for (const delay of [0, 150, 400]) {
    if (delay > 0) {
      await wait(delay);
    }

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return data.session;
    }
  }

  return null;
}

export async function resolveAuthSessionFromUrl(
  supabase: BrowserSupabaseClient,
  url: string
): Promise<{ sessionData: AuthSessionLinkData | null; errorMessage: string | null }> {
  const callbackLinkData = extractAuthCallbackLinkData(url);

  if (callbackLinkData?.accessToken && callbackLinkData.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: callbackLinkData.accessToken,
      refresh_token: callbackLinkData.refreshToken,
    });

    if (error) {
      return { sessionData: null, errorMessage: error.message };
    }
  } else if (callbackLinkData?.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(callbackLinkData.code);

    if (error) {
      return { sessionData: null, errorMessage: error.message };
    }
  } else if (callbackLinkData?.tokenHash) {
    const otpType = resolveOtpType(callbackLinkData.authType);

    if (!otpType) {
      return { sessionData: null, errorMessage: null };
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: callbackLinkData.tokenHash,
      type: otpType,
    });

    if (error) {
      return { sessionData: null, errorMessage: error.message };
    }
  }

  const session = await getSettledSession(supabase);

  if (!session) {
    return { sessionData: null, errorMessage: null };
  }

  return {
    sessionData: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      authType: callbackLinkData?.authType ?? null,
    },
    errorMessage: null,
  };
}
