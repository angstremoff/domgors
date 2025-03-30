import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function NotFoundPage() {
  const { t } = useTranslation()
  
  return (
    <>
      <SEO 
        title={t('common.notFound')} 
        description={t('common.notFoundDescription')}
        noindex={true}
      />
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <h1 className="text-9xl font-bold text-primary-600">404</h1>
          <p className="text-2xl font-semibold text-gray-700 mt-4">{t('common.pageNotFound')}</p>
          <p className="mt-6 text-gray-500">{t('common.notFoundMessage')}</p>
          <Link
            to="/"
            className="mt-8 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {t('common.backToHome')}
          </Link>
        </div>
      </div>
    </>
  )
}
