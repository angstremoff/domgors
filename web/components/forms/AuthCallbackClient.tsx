'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import {
  buildMobileAuthCallbackUrl,
  buildWebResetPasswordUrl,
  extractAuthSessionLinkData,
} from '@shared/utils/authSessionUrl';

type CallbackState = 'loading' | 'success' | 'error';

export function AuthCallbackClient() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [appLink, setAppLink] = useState('');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const completeAuth = async () => {
      const sessionLinkData = extractAuthSessionLinkData(window.location.href);

      if (!sessionLinkData) {
        setStatus('error');
        setErrorMessage(t('auth.invalidAuthLink'));
        return;
      }

      if (sessionLinkData.authType === 'recovery') {
        window.location.replace(`${buildWebResetPasswordUrl()}${window.location.hash}`);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: sessionLinkData.accessToken,
        refresh_token: sessionLinkData.refreshToken,
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message || t('auth.authCallbackError'));
        return;
      }

      setAppLink(buildMobileAuthCallbackUrl(sessionLinkData));
      setStatus('success');
    };

    void completeAuth();
  }, [supabase.auth, t]);

  if (status === 'loading') {
    return <p className="text-sm text-textSecondary">{t('common.loading')}</p>;
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-error bg-error/10 p-3">
          <p className="text-sm text-error">{errorMessage}</p>
        </div>
        <Link href="/prijava" className="text-sm text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-success bg-success/10 p-3">
        <p className="text-sm text-success">{t('auth.emailConfirmed')}</p>
      </div>

      <p className="text-sm leading-6 text-textSecondary">
        {t('auth.emailConfirmedHelp')}
      </p>

      <div className="flex flex-col gap-3">
        <Link
          href="/profil"
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-base font-medium text-white transition-colors hover:bg-primary/90"
        >
          {t('auth.continueToProfile')}
        </Link>

        {appLink ? (
          <a
            href={appLink}
            className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-base font-medium text-text transition-colors hover:bg-surface"
          >
            {t('auth.openInApp')}
          </a>
        ) : null}
      </div>
    </div>
  );
}
