'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { getAuthErrorMessage } from '@shared/utils/authErrorMessage';

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error: resetError } = await requestPasswordReset(email.trim());

      if (resetError) {
        setError(getAuthErrorMessage(resetError.message, t, 'reset-request'));
        setLoading(false);
        return;
      }

      setSuccess(t('auth.resetPasswordSent'));
      setEmail('');
      setLoading(false);
    } catch {
      setError(getAuthErrorMessage(null, t, 'reset-request'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm leading-6 text-textSecondary">
        {t('auth.resetPasswordHelp')}
      </p>

      <Input
        type="email"
        label={t('auth.email')}
        placeholder={t('auth.enterEmail')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />

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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.sendResetLink')}
      </Button>

      <p className="text-center text-sm text-textSecondary">
        <Link href="/prijava" className="text-primary hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </form>
  );
}
