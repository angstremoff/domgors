'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Building2, Home, Key, Plus } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@shared/lib/database.types';
import { PropertyCardCompact } from '@/components/property/PropertyCardCompact';
import { Skeleton } from '@/components/ui/Skeleton';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type PropertyWithRelations = PropertyRow & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export function HomePageClient() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [latestProperties, setLatestProperties] = useState<PropertyWithRelations[]>([]);
  const [latestLoading, setLatestLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadLatestProperties = async () => {
      setLatestLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          *,
          city:cities(name),
          district:districts(name)
        `
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!isMounted) return;

      if (error) {
        setLatestProperties([]);
      } else {
        setLatestProperties((data ?? []) as PropertyWithRelations[]);
      }
      setLatestLoading(false);
    };

    void loadLatestProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero секция */}
      <section className="text-center py-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text mb-4">
          DomGo.rs
        </h1>
        <p className="text-xl text-textSecondary max-w-2xl mx-auto">
          {t('web.heroSubtitle')}
        </p>
      </section>

      {/* Категории */}
      <section className="py-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
          {/* Продажа */}
          <Link
            href="/prodaja"
            className="group p-3 sm:p-6 border border-border rounded-lg hover:shadow-lg hover:border-primary transition-all bg-surface"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Building2 className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-xs sm:text-lg font-semibold text-text mb-0.5 sm:mb-2 leading-tight break-words whitespace-normal line-clamp-2">
                {t('common.sale')}
              </h3>
              <p className="hidden sm:block text-textSecondary text-sm">
                {t('property.saleApartment')}, {t('property.saleHouse')}
              </p>
            </div>
          </Link>

          {/* Аренда */}
          <Link
            href="/izdavanje"
            className="group p-3 sm:p-6 border border-border rounded-lg hover:shadow-lg hover:border-primary transition-all bg-surface"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Key className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-xs sm:text-lg font-semibold text-text mb-0.5 sm:mb-2 leading-tight break-words whitespace-normal line-clamp-2">
                <span className="sm:hidden">{t('web.homeRentShort')}</span>
                <span className="hidden sm:inline">{t('common.rent')}</span>
              </h3>
              <p className="hidden sm:block text-textSecondary text-sm">
                {t('property.rentApartment')}, {t('property.rentHouse')}
              </p>
            </div>
          </Link>

          {/* Новостройки */}
          <Link
            href="/novogradnja"
            className="group p-3 sm:p-6 border border-border rounded-lg hover:shadow-lg hover:border-primary transition-all bg-surface"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-10 h-10 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-primary/20 transition-colors">
                <Home className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-xs sm:text-lg font-semibold text-text mb-0.5 sm:mb-2 leading-tight break-words whitespace-normal line-clamp-2">
                {t('common.newBuildings')}
              </h3>
              <p className="hidden sm:block text-textSecondary text-sm">
                {t('common.newListings')}
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Последние объявления */}
      <section className="py-6">
        <h2 className="text-lg sm:text-xl font-bold text-text mb-4">
          {t('web.latestPropertiesTitle')}
        </h2>

        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
          <div className="flex gap-4 pb-2 snap-x snap-mandatory">
            {latestLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 snap-start w-72 sm:w-80">
                    <Skeleton className="h-40 w-full mb-3" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))
              : latestProperties.map((property) => (
                  <PropertyCardCompact key={property.id} property={property} />
                ))}
          </div>
        </div>

        {!latestLoading && latestProperties.length === 0 && (
          <p className="text-textSecondary text-sm mt-4">
            {t('web.latestPropertiesEmpty')}
          </p>
        )}
      </section>

      {/* CTA секция */}
      {!loading && (
        <section className="py-12 text-center max-w-2xl mx-auto">
          <div className="bg-surface border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold text-text mb-4">
              {t('property.addNew')}
            </h2>
            {user ? (
              <>
                <p className="text-textSecondary mb-6">
                  {t('property.addProperty.selectType')}
                </p>
                <Link
                  href="/oglas/novi"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  {t('property.add')}
                </Link>
              </>
            ) : (
              <>
                <p className="text-textSecondary mb-6">
                  {t('auth.requiredForAddingProperty')}
                </p>
                <Link
                  href="/registracija"
                  className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  {t('auth.register')}
                </Link>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
