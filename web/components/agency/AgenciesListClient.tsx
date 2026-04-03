'use client';

import { useEffect, useState, useMemo } from 'react';
import { Phone, Globe, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@shared/lib/database.types';
import { formatAgencySiteUrl } from '@shared/utils/agencyProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';

type Agency = Pick<
  Database['public']['Tables']['agency_profiles']['Row'],
  | 'id'
  | 'name'
  | 'phone'
  | 'email'
  | 'site'
  | 'location'
  | 'logo_url'
  | 'description'
  | 'city_id'
>;
type City = Database['public']['Tables']['cities']['Row'];

interface AgenciesListClientProps {
  initialAgencies?: Agency[];
  initialCities?: City[];
  initialDataLoaded?: boolean;
}

export function AgenciesListClient({
  initialAgencies = [],
  initialCities = [],
  initialDataLoaded = false,
}: AgenciesListClientProps) {
  const { t } = useTranslation();
  const [agencies, setAgencies] = useState<Agency[]>(initialAgencies);
  const [loading, setLoading] = useState(!initialDataLoaded);
  const [error, setError] = useState(false);
  const [cities, setCities] = useState<City[]>(initialCities);
  const [selectedCity, setSelectedCity] = useState<string | undefined>();
  const supabase = createClient();

  // Загрузка списка городов
  useEffect(() => {
    if (initialCities.length > 0) {
      return;
    }
    const fetchCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('*')
        .order('name');
      if (data) setCities(data);
    };
    fetchCities();
  }, [initialCities.length, supabase]);

  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('agency_profiles')
          .select('id, name, phone, email, site, location, logo_url, description, city_id')
          .order('name', { ascending: true });

        if (fetchError) {
          setError(true);
        } else {
          setAgencies((data as Agency[]) || []);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadAgencies();
  }, [supabase]);

  // Фильтрация агентств по городу
  const filteredAgencies = useMemo(() => {
    if (!selectedCity) return agencies;
    // Фильтруем строго по city_id
    // selectedCity это string, а city_id в базе number
    return agencies.filter(agency => String(agency.city_id) === selectedCity);
  }, [agencies, selectedCity]);

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId || undefined);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const renderEmptyState = () => (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-3">
          <MapPin className="h-12 w-12 text-textSecondary mx-auto" />
          <p className="text-textSecondary text-lg">
            {t(error ? 'common.errorLoadingData' : 'agency.emptyList')}
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

        {/* Фильтр по городу */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={selectedCity || ''}
            onChange={(e) => handleCityChange(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t('common.allCities')}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id.toString()}>
                {t(`cities.${city.name}`, { defaultValue: city.name })}
              </option>
            ))}
          </select>
        </div>

        {!filteredAgencies.length ? (
          renderEmptyState()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgencies.map((agency) => {
              const site = formatAgencySiteUrl(agency.site);

              return (
                <Link key={agency.id} href={`/agencija/?id=${agency.id}`} className="block h-full">
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-xl">
                        {agency.name || t('agency.unnamed')}
                      </CardTitle>
                      {agency.description && (
                        <p className="text-sm text-textSecondary line-clamp-2">
                          {agency.description}
                        </p>
                      )}
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
