'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { resolveAuthSessionFromUrl } from '@/lib/authSession';
import { buildMobileAuthCallbackUrl, extractAuthCallbackLinkData } from '@shared/utils/authSessionUrl';

type ResetState = 'preparing' | 'ready' | 'success' | 'error';

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ResetState>('preparing');
  const [appLink, setAppLink] = useState('');

  useEffect(() => {
    const prepareRecoverySession = async () => {
      const callbackLinkData = extractAuthCallbackLinkData(window.location.href);

      if (callbackLinkData?.authType && callbackLinkData.authType !== 'recovery') {
        setStatus('error');
        setError(t('auth.invalidAuthLink'));
        return;
      }

      const { sessionData, errorMessage } = await resolveAuthSessionFromUrl(supabase, window.location.href);

      if (sessionData) {
        setAppLink(buildMobileAuthCallbackUrl(sessionData));
        setStatus('ready');
        return;
      }

      setStatus('error');
      setError(errorMessage || t('auth.invalidAuthLink'));
    };

    void prepareRecoverySession();
  }, [supabase, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || t('auth.passwordUpdateError'));
        setLoading(false);
        return;
      }

      setSuccess(t('auth.passwordUpdated'));
      setStatus('success');
      setPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch {
      setError(t('auth.passwordUpdateError'));
      setLoading(false);
    }
  };

  if (status === 'preparing') {
    return <p className="text-sm text-textSecondary">{t('common.loading')}</p>;
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-error bg-error/10 p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
        <Link href="/zaboravljena-lozinka" className="text-sm text-primary hover:underline">
          {t('auth.requestNewResetLink')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm leading-6 text-textSecondary">
        {status === 'success' ? t('auth.passwordUpdatedHelp') : t('auth.setNewPasswordHelp')}
      </p>

      {error && (
        <div className="rounded-md border border-error bg-error/10 p-3">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-success bg-success/10 p-3">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {status !== 'success' ? (
        <>
          <Input
            type="password"
            label={t('auth.newPassword')}
            placeholder={t('auth.enterPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            type="password"
            label={t('auth.confirmPassword')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('auth.saveNewPassword')}
          </Button>
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        <Link href="/prijava" className="text-sm text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>

        {appLink ? (
          <a href={appLink} className="text-sm text-primary hover:underline">
            {t('auth.openInApp')}
          </a>
        ) : null}
      </div>
    </form>
  );
}
