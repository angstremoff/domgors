'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Phone, Globe, Mail, MapPin, ArrowLeft } from 'lucide-react';
import type { Database } from '@shared/lib/database.types';
import { formatAgencySiteUrl } from '@shared/utils/agencyProfile';
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

  const siteUrl = formatAgencySiteUrl(agency.site);

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
            <CardTitle className="text-3xl">{agency.name || t('agency.unnamed')}</CardTitle>
            {agency.description && (
              <p className="text-textSecondary">{agency.description}</p>
            )}
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
