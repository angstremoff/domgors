import type { Database } from '@shared/lib/database.types';

const SITE_NAME = 'DomGo.rs';

type PropertyForSeo = Database['public']['Tables']['properties']['Row'] & {
  city?: { name: string } | null;
};

type AgencyForSeo = Database['public']['Tables']['agency_profiles']['Row'] & {
  city?: { name: string } | null;
};

export function truncate(text: string, length: number): string {
  if (!text || text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function generatePropertyTitle(
  property: PropertyForSeo | null | undefined,
  locale: 'sr' | 'ru' = 'sr',
): string {
  if (!property) return SITE_NAME;

  const type = property.type === 'rent'
    ? (locale === 'ru' ? 'Аренда' : 'Izdavanje')
    : (locale === 'ru' ? 'Продажа' : 'Prodaja');

  const propType = property.property_type
    ? (
      locale === 'ru'
        ? (
          property.property_type === 'apartment'
            ? 'квартиры'
            : property.property_type === 'house'
              ? 'дома'
              : 'недвижимости'
        )
        : (
          property.property_type === 'apartment'
            ? 'stana'
            : property.property_type === 'house'
              ? 'kuće'
              : 'nekretnine'
        )
    )
    : '';

  const city = property.city?.name || '';
  const price = typeof property.price === 'number'
    ? `${property.price.toLocaleString()}€`
    : '';

  const items = [type, propType, city, price].filter(Boolean);
  return `${items.join(' ')} | ${SITE_NAME}`;
}

export function generatePropertyDescription(
  property: PropertyForSeo | null | undefined,
  locale: 'sr' | 'ru' = 'sr',
): string {
  if (!property) return '';

  // Берём описание объявления, если оно есть; иначе собираем из полей
  if (property.description) {
    return truncate(property.description, 160);
  }

  const parts: string[] = [];

  if (property.area) {
    parts.push(`${property.area} m²`);
  }

  if (property.rooms) {
    parts.push(locale === 'ru' ? `${property.rooms} комн.` : `${property.rooms} soba`);
  }

  if (property.location) {
    parts.push(property.location);
  }

  const baseDesc = parts.join(', ');
  const cta = locale === 'ru'
    ? 'Смотрите подробности и фото в приложении DomGo.'
    : 'Pogledajte detalje i fotografije u DomGo aplikaciji.';

  if (!baseDesc) {
    return cta;
  }

  return `${baseDesc}. ${cta}`;
}

export function generateAgencyTitle(
  agency: AgencyForSeo | null | undefined,
  locale: 'sr' | 'ru' = 'sr',
): string {
  if (!agency) return SITE_NAME;

  const name = agency.name || (locale === 'ru' ? 'Агентство' : 'Agencija');
  const city = agency.city?.name ? `(${agency.city.name})` : '';

  return `${name} ${city} | ${SITE_NAME}`;
}
