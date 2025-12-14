import type { Metadata } from 'next';
import EditPropertyPageClient from './EditPropertyPageClient';

export const metadata: Metadata = {
  title: 'Редактирование объявления - DomGo.rs',
  description: 'Редактирование существующего объявления на DomGo.rs',
  robots: { index: false, follow: true },
};

export default function EditPropertyPage() {
  return <EditPropertyPageClient />;
}

