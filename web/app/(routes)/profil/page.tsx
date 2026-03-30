'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Home, LogOut, Phone, Settings } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/Card';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function ProfilPage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const menuItems = [
    {
      href: '/profil/omiljeno',
      title: t('profile.favorites'),
      description: t('profile.favoritesDescription'),
      icon: Heart,
    },
    {
      href: '/profil/moji-oglasi',
      title: t('profile.myProperties'),
      description: t('profile.myPropertiesDescription'),
      icon: Home,
    },
    {
      href: '/profil/podesavanja',
      title: t('settings.title'),
      description: t('profile.settingsDescription'),
      icon: Settings,
    },
    {
      href: '/profil/kontakti',
      title: t('profile.contactInfo'),
      description: t('profile.contactInfoCardDescription'),
      icon: Phone,
    },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/prijava');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-center text-textSecondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">{t('profile.dashboardTitle')}</h1>
          <p className="text-textSecondary">{user.email}</p>
        </div>

        {/* Меню */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className="block h-full">
                <Card className="h-full cursor-pointer transition-all hover:shadow-lg">
                  <CardContent className="flex h-full min-h-[132px] items-start gap-4 p-6">
                    <Icon className="mt-1 h-10 w-10 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <h3 className="mb-1 text-xl font-semibold text-text">{item.title}</h3>
                      <p className="text-sm leading-6 text-textSecondary">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <button type="button" className="block w-full text-left" onClick={handleLogout}>
            <Card className="cursor-pointer border-error/25 transition-all hover:border-error/40 hover:shadow-lg">
              <CardContent className="flex min-h-[112px] items-start gap-4 p-6">
                <LogOut className="mt-1 h-10 w-10 shrink-0 text-error" />
                <div>
                  <h3 className="mb-1 text-xl font-semibold text-text">{t('common.logout')}</h3>
                  <p className="text-sm leading-6 text-textSecondary">{t('profile.logoutDescription')}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>
      </div>
    </div>
  );
}
