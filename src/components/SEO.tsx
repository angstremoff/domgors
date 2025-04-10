import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  imageUrl?: string
  type?: string
  noindex?: boolean
  canonicalUrl?: string // Добавляем поддержку прямого указания канонического URL
}

const SEO = ({
  title,
  description,
  keywords,
  imageUrl,
  type = 'website',
  noindex = false,
  canonicalUrl
}: SEOProps) => {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  
  // Используем значения по умолчанию, если не указаны конкретные
  const pageTitle = title 
    ? `${title} | DomGo` 
    : `DomGo - ${t('seo.defaultTitle')}`
  
  const pageDescription = description || t('seo.defaultDescription')
  const pageKeywords = keywords || t('seo.defaultKeywords')

  // Определяем правильные URL для текущих страниц для каждого языка
  const baseURL = 'https://domgo.rs'
  const path = window.location.pathname
  const currentURL = `${baseURL}${path}`
  const ruURL = `${currentURL}${currentURL.includes('?') ? '&' : '?'}lang=ru`
  const srURL = `${currentURL}${currentURL.includes('?') ? '&' : '?'}lang=sr`
  
  // Правильное форматирование канонической ссылки
  const canonicalURL = canonicalUrl || (path === '/' ? `${baseURL}/` : currentURL)
  
  // Изображение по умолчанию, если не указано другое
  const defaultImageUrl = `${baseURL}/property-preview.jpg`
  const ogImageUrl = imageUrl || defaultImageUrl

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentURL} />
      <meta property="og:image" content={ogImageUrl} />
      
      <link rel="canonical" href={canonicalURL} />
      <link rel="alternate" hrefLang="ru" href={ruURL} />
      <link rel="alternate" hrefLang="sr-Latn" href={srURL} />
      <link rel="alternate" hrefLang="x-default" href={baseURL} />
      <meta name="language" content={currentLang === 'ru' ? 'Russian' : 'Serbian'} />
    </Helmet>
  )
}

export default SEO
