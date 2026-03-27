import type { Metadata } from 'next';
import EditPropertyPageClient from './EditPropertyPageClient';

export const metadata: Metadata = {
  title: 'Izmena oglasa - DomGo.rs',
  description: 'Izmena postojećeg oglasa na DomGo.rs',
  robots: { index: false, follow: true },
};

export default function EditPropertyPage() {
  return <EditPropertyPageClient />;
}
