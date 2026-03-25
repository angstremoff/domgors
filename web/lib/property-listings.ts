import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';
import { getSupabasePublicEnv } from './supabase/env';

export const PROPERTY_LISTINGS_PAGE_SIZE = 50;

export type PropertyWithRelations = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
  district?: { name: string } | null;
};

export interface PropertyListingFilters {
  cityId?: number;
  districtId?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  rooms?: number;
}

export interface PropertyListingQueryOptions extends PropertyListingFilters {
  type: 'sale' | 'rent';
  isNewBuilding?: boolean;
  page?: number;
  pageSize?: number;
}

type PropertyListingsClient = SupabaseClient<Database, any, any>;

export function createPublicPropertyListingsClient(): PropertyListingsClient {
  const { supabaseUrl, supabaseAnonKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function dedupePropertyListings(properties: PropertyWithRelations[]): PropertyWithRelations[] {
  const seenIds = new Set<string>();

  return properties.filter((property) => {
    if (!property?.id || seenIds.has(property.id)) {
      return false;
    }

    seenIds.add(property.id);
    return true;
  });
}

export function mergePropertyListings(
  current: PropertyWithRelations[],
  incoming: PropertyWithRelations[]
): PropertyWithRelations[] {
  return dedupePropertyListings([...current, ...incoming]);
}

function buildPropertyListingsQuery(
  supabase: PropertyListingsClient,
  options: PropertyListingQueryOptions
) {
  let query = supabase
    .from('properties')
    .select(`
      *,
      city:cities(name),
      district:districts(name)
    `)
    .eq('type', options.type);

  if (options.isNewBuilding) {
    query = query.eq('is_new_building', true);
  }

  if (options.cityId !== undefined) {
    query = query.eq('city_id', options.cityId);
  }

  if (options.districtId) {
    query = query.eq('district_id', options.districtId);
  }

  if (options.propertyType) {
    query = query.eq('property_type', options.propertyType);
  }

  if (options.minPrice !== undefined) {
    query = query.gte('price', options.minPrice);
  }

  if (options.maxPrice !== undefined) {
    query = query.lte('price', options.maxPrice);
  }

  if (options.minArea !== undefined) {
    query = query.gte('area', options.minArea);
  }

  if (options.maxArea !== undefined) {
    query = query.lte('area', options.maxArea);
  }

  if (options.rooms !== undefined && options.propertyType !== 'land') {
    query = query.eq('rooms', options.rooms);
  }

  return query.order('created_at', { ascending: false });
}

export async function fetchPropertyListingsPage(
  supabase: PropertyListingsClient,
  options: PropertyListingQueryOptions
): Promise<PropertyWithRelations[]> {
  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? PROPERTY_LISTINGS_PAGE_SIZE;
  const rangeFrom = page * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  const { data, error } = await buildPropertyListingsQuery(supabase, options).range(rangeFrom, rangeTo);

  if (error) {
    throw error;
  }

  return dedupePropertyListings((data as PropertyWithRelations[] | null) ?? []);
}

export async function fetchInitialPropertyListings(
  options: Omit<PropertyListingQueryOptions, 'page' | 'pageSize'>
): Promise<PropertyWithRelations[]> {
  const supabase = createPublicPropertyListingsClient();

  return fetchPropertyListingsPage(supabase, {
    ...options,
    page: 0,
    pageSize: PROPERTY_LISTINGS_PAGE_SIZE,
  });
}
