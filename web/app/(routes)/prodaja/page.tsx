import { Metadata } from 'next';
import { PropertyListingsClient } from '@/components/property/PropertyListingsClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Prodaja nekretnina | Продажа недвижимости',
  description: 'Stanovi, kuće i poslovni prostori na prodaju u Srbiji. Квартиры, дома и коммерческая недвижимость на продажу в Сербии.',
  keywords: ['prodaja nekretnina', 'stanovi na prodaju', 'kuće na prodaju', 'продажа недвижимости', 'квартиры на продажу'],
  openGraph: {
    title: 'Prodaja nekretnina - DomGo.rs',
    description: 'Stanovi, kuće i poslovni prostori na prodaju u Srbiji',
    url: 'https://domgo.rs/prodaja',
  },
  alternates: {
    canonical: 'https://domgo.rs/prodaja',
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
    .order('created_at', { ascending: false })
    .limit(50);

  return (data as unknown as PropertyWithRelations[]) || [];
}

export default async function ProdajaPage() {
  const initialProperties = await loadInitialProperties();
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Prodaja' }]} />
      <PropertyListingsClient type="sale" initialProperties={initialProperties} />
    </div>
  );
}
