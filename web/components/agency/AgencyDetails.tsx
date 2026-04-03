'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Phone, Globe, Mail, MapPin, ArrowLeft, Send, Building2 } from 'lucide-react';
import type { Database } from '@shared/lib/database.types';
import { formatAgencySiteUrl, formatAgencyTelegramUrl, isTelegramValue } from '@shared/utils/agencyProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PropertyGrid } from '@/components/property/PropertyGrid';

type Agency = Database['public']['Tables']['agency_profiles']['Row'];

type Property = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

interface AgencyDetailsProps {
  agency: Agency;
  properties: Property[];
}

export function AgencyDetails({ agency, properties }: AgencyDetailsProps) {
  const { t } = useTranslation();

  const siteIsTelegram = isTelegramValue(agency.site);
  const siteUrl = siteIsTelegram ? null : formatAgencySiteUrl(agency.site);
  const telegramUrl = siteIsTelegram ? formatAgencyTelegramUrl(agency.site) : null;

  const handleCall = () => {
    if (agency.phone) {
      window.location.href = `tel:${agency.phone}`;
    }
  };

  const handleEmail = () => {
    if (agency.email) {
      window.location.href = `mailto:${agency.email}`;
    }
  };

  const handleSite = () => {
    if (siteUrl) {
      window.open(siteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTelegram = () => {
    if (telegramUrl) {
      window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center gap-3 text-sm text-textSecondary">
        <ArrowLeft className="h-4 w-4" />
        <Link href="/agencije" className="hover:text-primary">
          {t('agency.backToList')}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-4">
              {agency.logo_url ? (
                <img
                  src={agency.logo_url}
                  alt={agency.name || t('agency.unnamed')}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <CardTitle className="text-3xl">{agency.name || t('agency.unnamed')}</CardTitle>
                {agency.description && (
                  <p className="text-textSecondary mt-1">{agency.description}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-textSecondary">
              {agency.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{agency.location}</span>
                </div>
              )}
              {agency.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${agency.phone}`} className="hover:text-primary">
                    {agency.phone}
                  </a>
                </div>
              )}
              {agency.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${agency.email}`} className="hover:text-primary">
                    {agency.email}
                  </a>
                </div>
              )}
              {siteUrl && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary truncate"
                  >
                    {agency.site}
                  </a>
                </div>
              )}
              {telegramUrl && (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-primary truncate"
                  >
                    Telegram
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('agency.contact')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agency.phone && (
              <Button onClick={handleCall} className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                {t('agency.call')}
              </Button>
            )}
            {agency.email && (
              <Button onClick={handleEmail} variant="outline" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                {t('agency.email')}
              </Button>
            )}
            {siteUrl && (
              <Button onClick={handleSite} variant="ghost" className="w-full">
                <Globe className="h-4 w-4 mr-2" />
                {t('agency.website')}
              </Button>
            )}
            {telegramUrl && (
              <Button onClick={handleTelegram} variant="ghost" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {t('agency.telegram')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text">{t('agency.listingsTitle')}</h2>
          <span className="text-textSecondary text-sm">
            {t('agency.listingsCount', { count: properties.length })}
          </span>
        </div>
        <PropertyGrid properties={properties} />
      </div>
    </div>
  );
}
