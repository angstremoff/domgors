import { Metadata } from 'next';
import { AgenciesListClient } from '@/components/agency/AgenciesListClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Agencije za nekretnine',
  description: 'Proverene agencije za nekretnine u Srbiji na DomGo.rs.',
  keywords: ['agencije za nekretnine', 'agencija za stanove', 'agencija za kuće'],
  openGraph: {
    title: 'Agencije za nekretnine - DomGo.rs',
    description: 'Proverene agencije za nekretnine u Srbiji na DomGo.rs.',
    url: 'https://domgo.rs/agencije',
  },
  alternates: {
    canonical: 'https://domgo.rs/agencije',
  },
};

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

async function loadInitialData(): Promise<{
  agencies: Agency[];
  cities: City[];
  dataLoaded: boolean;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { agencies: [], cities: [], dataLoaded: false };
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const [{ data: citiesData }, { data: agenciesData }] = await Promise.all([
    supabase.from('cities').select('*').order('name'),
    supabase
      .from('agency_profiles')
      .select('id, name, phone, email, site, location, logo_url, description, city_id')
      .order('name', { ascending: true })
      .limit(50),
  ]);

  return {
    agencies: (agenciesData as Agency[]) || [],
    cities: (citiesData as City[]) || [],
    dataLoaded: true,
  };
}

export default async function AgenciePage() {
  const { agencies, cities, dataLoaded } = await loadInitialData();
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Agencije' }]} />
      <AgenciesListClient initialAgencies={agencies} initialCities={cities} initialDataLoaded={dataLoaded} />
    </div>
  );
}
