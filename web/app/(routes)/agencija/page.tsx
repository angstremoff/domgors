import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgencyPageClient } from '@/components/agency/AgencyPageClient';
import {
  buildAgencyMetadata,
  buildAgencyNotFoundMetadata,
  getAgencyPageData,
  getSingleSearchParam,
  resolveSearchParams,
  type SearchParamsInput,
} from '@/lib/seo-page-data';

export const dynamic = 'force-dynamic';

interface AgencijaPageProps {
  searchParams: SearchParamsInput;
}

export async function generateMetadata({ searchParams }: AgencijaPageProps): Promise<Metadata> {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const agencyId = getSingleSearchParam(resolvedSearchParams.id);

  if (!agencyId) {
    return buildAgencyNotFoundMetadata();
  }

  const agencyPageData = await getAgencyPageData(agencyId);
  return agencyPageData ? buildAgencyMetadata(agencyPageData) : buildAgencyNotFoundMetadata();
}

export default async function AgencijaPage({ searchParams }: AgencijaPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const agencyId = getSingleSearchParam(resolvedSearchParams.id);

  if (!agencyId) {
    notFound();
  }

  const agencyPageData = await getAgencyPageData(agencyId);

  if (!agencyPageData) {
    notFound();
  }

  return (
    <AgencyPageClient
      agency={agencyPageData.agency}
      properties={agencyPageData.properties}
    />
  );
}
