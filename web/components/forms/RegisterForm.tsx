'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from 'react-i18next';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const { error, session } = await signUp(email, password);

      if (error) {
        setError(error.message || t('auth.registerError'));
        setLoading(false);
      } else {
        setLoading(false);

        if (session) {
          router.push('/profil');
          router.refresh();
          return;
        }

        setSuccess(t('auth.confirmEmailSent'));
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError(t('auth.registerError'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        label={t('auth.email')}
        placeholder={t('auth.enterEmail')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={loading}
      />

      <Input
        type="password"
        label={t('auth.password')}
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

      {error && (
        <div className="p-3 bg-error/10 border border-error rounded-md">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-success/10 border border-success rounded-md">
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.register')}
      </Button>

      <p className="text-center text-sm text-textSecondary">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link href="/prijava" className="text-primary hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </form>
  );
}
