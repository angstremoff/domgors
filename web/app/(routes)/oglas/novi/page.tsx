import { Metadata } from 'next';
import { AddPropertyForm } from '@/components/property/AddPropertyForm';

export const metadata: Metadata = {
  title: 'Dodaj oglas - DomGo.rs',
  description: 'Objava novog oglasa za nekretninu na DomGo.rs',
  robots: { index: false, follow: true },
};

export default function NewListingPage() {
  return <AddPropertyForm />;
}
