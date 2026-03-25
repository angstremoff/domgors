import { Metadata } from 'next';
import { PropertyListingsClient } from '@/components/property/PropertyListingsClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { fetchInitialPropertyListings } from '@/lib/property-listings';

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

export default async function ProdajaPage() {
  const initialProperties = await fetchInitialPropertyListings({ type: 'sale' });
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Prodaja' }]} />
      <PropertyListingsClient type="sale" initialProperties={initialProperties} />
    </div>
  );
}
