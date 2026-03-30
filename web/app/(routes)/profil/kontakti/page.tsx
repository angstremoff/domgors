'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ContactProfileForm } from '@/components/profile/ContactProfileForm';

export default function ProfilKontaktiPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/profil">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text">{t('profile.contactInfo')}</h1>
            <p className="text-textSecondary">{t('profile.contactInfoDescription')}</p>
          </div>
        </div>

        <ContactProfileForm />
      </div>
    </div>
  );
}
