'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import { resolveAuthSessionFromUrl } from '@/lib/authSession';
import { getAuthErrorMessage } from '@shared/utils/authErrorMessage';
import {
  buildMobileAuthCallbackUrl,
  buildWebResetPasswordUrl,
  extractAuthCallbackLinkData,
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
      const callbackLinkData = extractAuthCallbackLinkData(window.location.href);

      if (callbackLinkData?.authType === 'recovery') {
        const resetPasswordUrl = new URL(buildWebResetPasswordUrl());
        resetPasswordUrl.search = window.location.search;
        resetPasswordUrl.hash = window.location.hash;
        window.location.replace(resetPasswordUrl.toString());
        return;
      }

      const { sessionData, errorMessage } = await resolveAuthSessionFromUrl(supabase, window.location.href);

      if (!sessionData) {
        setStatus('error');
        setErrorMessage(getAuthErrorMessage(errorMessage, t, 'auth-link'));
        return;
      }

      setAppLink(buildMobileAuthCallbackUrl(sessionData));
      setStatus('success');
    };

    void completeAuth();
  }, [supabase, t]);

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
