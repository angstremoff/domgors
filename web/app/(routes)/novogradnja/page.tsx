import { Metadata } from 'next';
import { PropertyListingsClient } from '@/components/property/PropertyListingsClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { fetchInitialPropertyListings } from '@/lib/property-listings';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Novogradnja',
  description: 'Stanovi u novim stambenim kompleksima Srbije na DomGo.rs.',
  keywords: ['novogradnja', 'novi stanovi', 'stambeni kompleksi', 'stanovi od investitora'],
  openGraph: {
    title: 'Novogradnja - DomGo.rs',
    description: 'Stanovi u novim stambenim kompleksima Srbije na DomGo.rs.',
    url: 'https://domgo.rs/novogradnja',
  },
  alternates: {
    canonical: 'https://domgo.rs/novogradnja',
  },
};

export default async function NovogradnjaPage() {
  const initialProperties = await fetchInitialPropertyListings({
    type: 'sale',
    isNewBuilding: true,
  });
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Novogradnja' }]} />
      <PropertyListingsClient type="sale" isNewBuilding={true} initialProperties={initialProperties} />
    </div>
  );
}
