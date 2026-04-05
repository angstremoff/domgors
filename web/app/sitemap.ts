import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/lib/database.types';

const BASE_URL = 'https://domgo.rs';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Статические маршруты
    const routes = [
        '',
        '/prodaja',
        '/izdavanje',
        '/novogradnja',
        '/agencije',
    ].map((route) => ({
        url: route === '' ? `${BASE_URL}/` : `${BASE_URL}${route}/`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // Получаем активные объявления
    // Примечание: берём максимум 10000, чтобы не упереться в лимиты/таймауты.
    // Для большого проекта нужно дробить sitemap на несколько файлов.
    const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10000);

    const properties = propertiesData as unknown as { id: string; created_at: string }[] | null;

    const propertyRoutes = (properties || []).map((property) => ({
        url: `${BASE_URL}/oglas/?id=${property.id}`,
        lastModified: new Date(property.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
    }));

    // Получаем агентства
    const { data: agenciesData } = await supabase
        .from('agency_profiles')
        .select('id, created_at')
        .limit(1000);

    const agencies = agenciesData as unknown as { id: string; created_at: string }[] | null;

    const agencyRoutes = (agencies || []).map((agency) => ({
        url: `${BASE_URL}/agencija/?id=${agency.id}`,
        lastModified: new Date(agency.created_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
    }));

    return [...routes, ...propertyRoutes, ...agencyRoutes];
}
