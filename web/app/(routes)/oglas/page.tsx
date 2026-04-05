import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PropertyPageClient } from '@/components/property/PropertyPageClient';
import {
  buildPropertyMetadata,
  buildPropertyNotFoundMetadata,
  getPropertyPageData,
  getSingleSearchParam,
  resolveSearchParams,
  type SearchParamsInput,
} from '@/lib/seo-page-data';

export const dynamic = 'force-dynamic';

interface OglasPageProps {
  searchParams: SearchParamsInput;
}

export async function generateMetadata({ searchParams }: OglasPageProps): Promise<Metadata> {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const propertyId = getSingleSearchParam(resolvedSearchParams.id);

  if (!propertyId) {
    return buildPropertyNotFoundMetadata();
  }

  const property = await getPropertyPageData(propertyId);
  return property ? buildPropertyMetadata(property) : buildPropertyNotFoundMetadata();
}

export default async function OglasPage({ searchParams }: OglasPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const propertyId = getSingleSearchParam(resolvedSearchParams.id);

  if (!propertyId) {
    notFound();
  }

  const property = await getPropertyPageData(propertyId);

  if (!property) {
    notFound();
  }

  return <PropertyPageClient property={property} />;
}
