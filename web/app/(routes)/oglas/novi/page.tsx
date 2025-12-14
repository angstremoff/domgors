import { Metadata } from 'next';
import { AddPropertyForm } from '@/components/property/AddPropertyForm';

export const metadata: Metadata = {
  title: 'Добавить объявление - DomGo.rs',
  description: 'Публикация нового объявления о недвижимости на DomGo.rs',
  robots: { index: false, follow: true },
};

export default function NewListingPage() {
  return <AddPropertyForm />;
}
