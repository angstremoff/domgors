import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Property } from '../contexts/PropertyContext';

interface SchemaMarkupProps {
  property?: Property;
  isHomePage?: boolean;
}

const SchemaMarkup = ({ property, isHomePage = false }: SchemaMarkupProps) => {
  const location = useLocation();
  const baseUrl = 'https://domgo.rs';
  const currentUrl = `${baseUrl}${location.pathname}`;

  // Разметка для организации (на всех страницах)
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${baseUrl}/#organization`,
    name: 'DomGo',
    url: baseUrl,
    logo: `${baseUrl}/logo.svg`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RS',
      addressLocality: 'Belgrade'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+381-XXX-XXX-XXX',
      email: 'admin@domgo.rs',
      contactType: 'customer service'
    }
  };

  // Разметка для страницы детального просмотра объекта недвижимости
  const propertySchema = property ? {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${currentUrl}#listing`,
    url: currentUrl,
    name: property.title,
    description: property.description,
    datePosted: property.created_at,
    image: property.images && property.images.length > 0 ? property.images[0] : undefined,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock'
    },
    location: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'RS',
        addressLocality: property.city_id ? property.city_id.toString() : 'Serbia'
      }
    }
  } : null;

  // Разметка для домашней страницы
  const websiteSchema = isHomePage ? {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    url: baseUrl,
    name: 'DomGo - Недвижимость в Сербии',
    description: 'Аренда и продажа недвижимости в Сербии',
    publisher: {
      '@id': `${baseUrl}/#organization`
    }
  } : null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      
      {propertySchema && (
        <script type="application/ld+json">
          {JSON.stringify(propertySchema)}
        </script>
      )}
      
      {websiteSchema && (
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>
      )}
    </Helmet>
  );
};

export default SchemaMarkup;
