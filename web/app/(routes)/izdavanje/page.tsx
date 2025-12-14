import { Metadata } from 'next';
import { PropertyListingsClient } from '@/components/property/PropertyListingsClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Izdavanje nekretnina | Аренда недвижимости',
  description: 'Stanovi i kuće za dugoročni zakup u Srbiji. Квартиры и дома в долгосрочную аренду в Сербии.',
  keywords: ['izdavanje stanova', 'zakup nekretnina', 'kirija stan', 'аренда квартир', 'снять квартиру в сербии'],
  openGraph: {
    title: 'Izdavanje nekretnina - DomGo.rs',
    description: 'Stanovi i kuće za dugoročni zakup u Srbiji',
    url: 'https://domgo.rs/izdavanje',
  },
  alternates: {
    canonical: 'https://domgo.rs/izdavanje',
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
    .eq('type', 'rent')
    .order('created_at', { ascending: false })
    .limit(50);

  return (data as unknown as PropertyWithRelations[]) || [];
}

export default async function IzdavanjePage() {
  const initialProperties = await loadInitialProperties();
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Izdavanje' }]} />
      <PropertyListingsClient type="rent" initialProperties={initialProperties} />
    </div>
  );
}
