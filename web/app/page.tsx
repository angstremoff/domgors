import type { Metadata } from 'next';
import { HomePageClient } from '@/components/home/HomePageClient';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://domgo.rs/',
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
