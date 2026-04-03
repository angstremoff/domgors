'use client';

import { Phone, Globe, Mail, MapPin, Send, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Database } from '@shared/lib/database.types';
import { formatAgencySiteUrl, formatAgencyTelegramUrl, isTelegramValue } from '@shared/utils/agencyProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

type Agency = Database['public']['Tables']['agency_profiles']['Row'];

interface AgenciesListProps {
  agencies: Agency[];
  hasError?: boolean;
}

export function AgenciesList({ agencies, hasError = false }: AgenciesListProps) {
  const { t } = useTranslation();

  const renderEmptyState = () => (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-3">
          <MapPin className="h-12 w-12 text-textSecondary mx-auto" />
          <p className="text-textSecondary text-lg">
            {t(hasError ? 'common.errorLoadingData' : 'agency.emptyList')}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-text mb-2">{t('agency.listTitle')}</h1>
          <p className="text-textSecondary">{t('agency.listDescription')}</p>
        </div>

        {!agencies.length ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agencies.map((agency) => {
              const siteIsTelegram = isTelegramValue(agency.site);
              const site = siteIsTelegram ? null : formatAgencySiteUrl(agency.site);
              const telegram = siteIsTelegram ? formatAgencyTelegramUrl(agency.site) : null;

              return (
                <Link key={agency.id} href={`/agencija/?id=${agency.id}`} className="block h-full">
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {agency.logo_url ? (
                          <img
                            src={agency.logo_url}
                            alt={agency.name || t('agency.unnamed')}
                            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <CardTitle className="text-xl">
                            {agency.name || t('agency.unnamed')}
                          </CardTitle>
                          {agency.description && (
                            <p className="text-sm text-textSecondary line-clamp-2 mt-1">
                              {agency.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm text-textSecondary">
                        {agency.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span className="hover:text-primary">{agency.phone}</span>
                          </div>
                        )}
                        {agency.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="hover:text-primary">{agency.email}</span>
                          </div>
                        )}
                        {site && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span className="hover:text-primary truncate">{agency.site}</span>
                          </div>
                        )}
                        {telegram && (
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            <span className="hover:text-primary">Telegram</span>
                          </div>
                        )}
                        {agency.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">{agency.location}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
