import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  canonicalUrl?: string
  imageUrl?: string
  type?: string
  noindex?: boolean
}

const SEO = ({
  title,
  description,
  keywords,
  canonicalUrl = 'https://domgo.rs',
  imageUrl,
  type = 'website',
  noindex = false
}: SEOProps) => {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  
  // Используем значения по умолчанию, если не указаны конкретные
  const pageTitle = title 
    ? `${title} | DomGo` 
    : `DomGo - ${t('seo.defaultTitle')}`
  
  const pageDescription = description || t('seo.defaultDescription')
  const pageKeywords = keywords || t('seo.defaultKeywords')

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="ru" href={`${canonicalUrl}${canonicalUrl.includes('?') ? '&' : '?'}lang=ru`} />
      <link rel="alternate" hrefLang="sr-Latn" href={`${canonicalUrl}${canonicalUrl.includes('?') ? '&' : '?'}lang=sr`} />
      <meta name="language" content={currentLang === 'ru' ? 'Russian' : 'Serbian'} />
    </Helmet>
  )
}

export default SEO
