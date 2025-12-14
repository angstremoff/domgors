import { Metadata } from 'next';
import { PropertyListingsClient } from '@/components/property/PropertyListingsClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Novogradnja | Новостройки',
  description: 'Stanovi u novim stambenim kompleksima Srbije. Квартиры в новостройках Сербии от застройщиков.',
  keywords: ['novogradnja', 'novi stanovi', 'stambeni kompleksi', 'новостройки сербия', 'квартиры от застройщика'],
  openGraph: {
    title: 'Novogradnja - DomGo.rs',
    description: 'Stanovi u novim stambenim kompleksima Srbije',
    url: 'https://domgo.rs/novogradnja',
  },
  alternates: {
    canonical: 'https://domgo.rs/novogradnja',
  },
};

type PropertyWithRelations = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

async function loadInitialProperties(): Promise<PropertyWithRelations[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('properties')
    .select(`
      *,
      city:cities(name),
      district:districts(name)
    `)
    .eq('type', 'sale')
    .eq('is_new_building', true)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data as unknown as PropertyWithRelations[]) || [];
}

export default async function NovogradnjaPage() {
  const initialProperties = await loadInitialProperties();
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Novogradnja' }]} />
      <PropertyListingsClient type="sale" isNewBuilding={true} initialProperties={initialProperties} />
    </div>
  );
}
