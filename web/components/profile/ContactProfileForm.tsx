'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Save, UserRound, Phone, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  fetchContactProfile,
  getContactProfileValidationError,
  saveContactProfile,
  type ContactProfileClient,
  type ContactProfile,
} from '@shared/utils/contactProfile';

const EMPTY_CONTACT_PROFILE: ContactProfile = {
  name: '',
  phone: '',
  email: '',
  avatar_url: null,
};

export function ContactProfileForm() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const contactSupabase = supabase as unknown as ContactProfileClient;
  const [profile, setProfile] = useState<ContactProfile>(EMPTY_CONTACT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await fetchContactProfile(contactSupabase, user.id, user.email || '');
        if (!cancelled) {
          setProfile(data);
        }
      } catch {
        if (!cancelled) {
          setError(t('profile.errors.saveFailed'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, contactSupabase, t, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setError(null);
    setSuccess(null);

    const validationError = getContactProfileValidationError(profile);
    if (validationError === 'name') {
      setError(t('profile.errors.nameRequired'));
      return;
    }

    if (validationError === 'phone') {
      setError(t('profile.errors.phoneRequired'));
      return;
    }

    try {
      setSaving(true);
      const savedProfile = await saveContactProfile(contactSupabase, {
        userId: user.id,
        email: user.email || profile.email,
        profile,
      });
      setProfile(savedProfile);
      setSuccess(t('profile.contactInfoSaved'));
    } catch {
      setError(t('profile.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('auth.loginRequired')}</CardTitle>
          <CardDescription>{t('auth.loginRequiredDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/prijava">
            <Button>{t('common.login')}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.contactInfo')}</CardTitle>
        <CardDescription>{t('profile.contactInfoDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('profile.name')}
              value={profile.name}
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              placeholder={t('addProperty.form.namePlaceholder')}
              autoComplete="name"
              required
            />
            <Input
              label={t('profile.phone')}
              value={profile.phone}
              onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
              placeholder={t('addProperty.form.phonePlaceholder')}
              autoComplete="tel"
              required
            />
          </div>

          <Input
            label={t('profile.email')}
            value={profile.email || user.email || ''}
            disabled
            readOnly
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-textSecondary">
              <div className="mb-2 flex items-center gap-2 text-text">
                <UserRound className="h-4 w-4 text-primary" />
                {t('profile.name')}
              </div>
              {t('profile.contactNameHint')}
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-textSecondary">
              <div className="mb-2 flex items-center gap-2 text-text">
                <Phone className="h-4 w-4 text-primary" />
                {t('profile.phone')}
              </div>
              {t('profile.contactPhoneHint')}
            </div>
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-textSecondary">
              <div className="mb-2 flex items-center gap-2 text-text">
                <Mail className="h-4 w-4 text-primary" />
                {t('profile.email')}
              </div>
              {t('profile.contactEmailHint')}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Link href="/profil">
              <Button type="button" variant="outline">
                {t('common.back')}
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
