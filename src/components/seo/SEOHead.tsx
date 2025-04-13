import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  lang?: 'ru' | 'sr';
  type?: 'website' | 'article';
  ogUrl?: string;
}

/**
 * Компонент для SEO оптимизации
 * Добавляет мета-теги для страницы, включая Open Graph и Twitter
 */
const SEOHead: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage, 
  canonicalUrl,
  noindex = false,
  lang = 'ru',
  type = 'website',
  ogUrl
}) => {
  // Получаем базовый URL сайта
  const siteUrl = window.location.origin;
  const currentUrl = ogUrl || window.location.href;
  
  // Значения по умолчанию из переводов
  const defaults = {
    ru: {
      title: 'DomGo - Недвижимость в Сербии для русских | Аренда и продажа квартир и домов',
      description: 'Лучшие предложения по аренде и продаже квартир, домов и земельных участков в Сербии для россиян. Большой выбор объектов недвижимости в Белграде и других городах, актуальные цены, фото и описания.',
      keywords: 'недвижимость сербия, купить квартиру в сербии, аренда квартиры в сербии, недвижимость в белграде, дома в сербии, снять квартиру в сербии',
    },
    sr: {
      title: 'DomGo - Nekretnine u Srbiji | Izdavanje i prodaja stanova i kuća',
      description: 'Najbolje ponude za iznajmljivanje i prodaju stanova, kuća i placeva u Srbiji. Veliki izbor nekretnina u Beogradu i drugim gradovima, aktuelne cene, fotografije i opisi.',
      keywords: 'nekretnine srbija, kupiti stan u srbiji, iznajmljivanje stana u srbiji, nekretnine u beogradu, kuća u srbiji kupiti',
    }
  };

  // Используем значения по умолчанию, если пользовательские не указаны
  const pageTitle = title || defaults[lang].title;
  const pageDescription = description || defaults[lang].description;
  const pageKeywords = keywords || defaults[lang].keywords;
  const defaultImage = `${siteUrl}/og-image-${lang}.jpg`;
  const pageImage = ogImage || defaultImage;
  
  return (
    <Helmet>
      {/* Основные мета-теги */}
      <html lang={lang} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {pageKeywords && <meta name="keywords" content={pageKeywords} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Open Graph мета-теги для соц. сетей */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="DomGo" />
      <meta property="og:locale" content={lang === 'ru' ? 'ru_RU' : 'sr_RS'} />
      
      {/* Twitter Card мета-теги */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      
      {/* Дополнительные мета-теги */}
      <meta name="application-name" content="DomGo" />
      <meta name="apple-mobile-web-app-title" content="DomGo" />
      <meta name="theme-color" content="#4f46e5" />
    </Helmet>
  );
};

export default SEOHead;
