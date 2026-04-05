import { Metadata } from 'next';
import { PropertyListingsClient } from '@/components/property/PropertyListingsClient';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { fetchInitialPropertyListings } from '@/lib/property-listings';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Izdavanje nekretnina',
  description: 'Stanovi i kuće za dugoročni zakup u Srbiji na DomGo.rs.',
  keywords: ['izdavanje stanova', 'zakup nekretnina', 'kirija stan', 'izdavanje kuća'],
  openGraph: {
    title: 'Izdavanje nekretnina - DomGo.rs',
    description: 'Stanovi i kuće za dugoročni zakup u Srbiji na DomGo.rs.',
    url: 'https://domgo.rs/izdavanje',
  },
  alternates: {
    canonical: 'https://domgo.rs/izdavanje',
  },
};

export default async function IzdavanjePage() {
  const initialProperties = await fetchInitialPropertyListings({ type: 'rent' });
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <Breadcrumbs items={[{ name: 'Izdavanje' }]} />
      <PropertyListingsClient type="rent" initialProperties={initialProperties} />
    </div>
  );
}
