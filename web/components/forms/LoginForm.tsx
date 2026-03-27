'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from 'react-i18next';
import { getAuthErrorMessage } from '@shared/utils/authErrorMessage';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(getAuthErrorMessage(error.message, t, 'login'));
        setLoading(false);
      } else {
        router.push('/profil');
        router.refresh();
      }
    } catch {
      setError(getAuthErrorMessage(null, t, 'login'));
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

      {error && (
        <div className="p-3 bg-error/10 border border-error rounded-md">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('auth.login')}
      </Button>

      <div className="text-right">
        <Link href="/zaboravljena-lozinka" className="text-sm text-primary hover:underline">
          {t('auth.forgotPassword')}
        </Link>
      </div>

      <p className="text-center text-sm text-textSecondary">
        {t('auth.noAccount')}{' '}
        <Link href="/registracija" className="text-primary hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </form>
  );
}
