'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Save, UserRound, Phone, Mail, Building2, Upload, X } from 'lucide-react';
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
import {
  fetchAgencyProfileByUserId,
  upsertAgencyProfile,
  uploadAgencyLogo,
  type AgencyProfileFormData,
  type AgencySupabaseClient,
} from '@shared/utils/agencyProfile';

const EMPTY_CONTACT_PROFILE: ContactProfile = {
  name: '',
  phone: '',
  email: '',
  avatar_url: null,
};

const EMPTY_AGENCY_PROFILE: AgencyProfileFormData = {
  name: '',
  email: '',
  site: '',
  location: '',
  logo_url: '',
};

export function ContactProfileForm() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const contactSupabase = supabase as unknown as ContactProfileClient;
  const agencySupabase = supabase as unknown as AgencySupabaseClient;
  const [profile, setProfile] = useState<ContactProfile>(EMPTY_CONTACT_PROFILE);
  const [agencyProfile, setAgencyProfile] = useState<AgencyProfileFormData | null>(null);
  const [isAgency, setIsAgency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await fetchContactProfile(contactSupabase, user.id, user.email || '');
        if (!cancelled) setProfile(data);

        const { data: userData } = await supabase
          .from('users')
          .select('is_agency')
          .eq('id', user.id)
          .maybeSingle();

        const userIsAgency = (userData as { is_agency: boolean } | null)?.is_agency === true;
        if (!cancelled) setIsAgency(userIsAgency);

        if (userIsAgency) {
          const agencyData = await fetchAgencyProfileByUserId(agencySupabase, user.id);
          if (!cancelled) {
            setAgencyProfile(agencyData || { ...EMPTY_AGENCY_PROFILE });
            if (agencyData?.logo_url) setLogoPreview(agencyData.logo_url);
          }
        }
      } catch {
        if (!cancelled) setError(t('profile.errors.saveFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => { cancelled = true; };
  }, [authLoading, contactSupabase, agencySupabase, supabase, t, user]);

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!user) return;
    try {
      setUploadingLogo(true);
      const url = await uploadAgencyLogo(agencySupabase, user.id, file);
      setAgencyProfile((current) => current ? { ...current, logo_url: url } : null);
      setLogoPreview(url);
    } catch (err) {
      console.error('[ContactProfileForm] logo upload failed:', err);
      setError(t('profile.errors.saveFailed'));
    } finally {
      setUploadingLogo(false);
    }
  }, [agencySupabase, t, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

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

      if (isAgency && agencyProfile) {
        await upsertAgencyProfile(agencySupabase, user.id, agencyProfile);
      }

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

          {isAgency && agencyProfile && (
            <div className="border-t border-border pt-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-text">{t('agency.title')}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">{t('agency.logo', 'Logo')}</label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview(null);
                            setAgencyProfile((current) => current ? { ...current, logo_url: '' } : null);
                          }}
                          className="absolute -top-1 -right-1 rounded-full bg-black/60 p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-text hover:border-primary">
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{t('property.addProperty.addPhoto', 'Dodaj')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleLogoUpload(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <Input
                  label={t('agency.title', 'Agencija')}
                  value={agencyProfile.name}
                  onChange={(event) => setAgencyProfile((current) => current ? { ...current, name: event.target.value } : null)}
                  placeholder={t('agency.title', 'Agencija')}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('profile.email')}
                    value={agencyProfile.email}
                    onChange={(event) => setAgencyProfile((current) => current ? { ...current, email: event.target.value } : null)}
                    placeholder="agency@example.com"
                  />
                  <Input
                    label={t('profile.phone')}
                    value={profile.phone}
                    disabled
                    readOnly
                  />
                </div>

                <Input
                  label={t('agency.siteOrTelegram', 'Telegram / Sajt')}
                  value={agencyProfile.site}
                  onChange={(event) => setAgencyProfile((current) => current ? { ...current, site: event.target.value } : null)}
                  placeholder="@username, t.me/... ili https://..."
                />

                <Input
                  label={t('property.addProperty.propertyAddress', 'Adresa')}
                  value={agencyProfile.location}
                  onChange={(event) => setAgencyProfile((current) => current ? { ...current, location: event.target.value } : null)}
                  placeholder={t('property.addProperty.propertyAddressPlaceholder', 'Npr. Ul. Kneza Miloša 10')}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Link href="/profil">
              <Button type="button" variant="outline">
                {t('common.back')}
              </Button>
            </Link>
            <Button type="submit" disabled={saving || uploadingLogo}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
