import { useEffect, useState } from 'react'
import PropertyCard from '../components/property/PropertyCard'
import PropertyMap from '../components/property/PropertyMap'
import QuickFilters from '../components/property/QuickFilters'
import { useProperties } from '../contexts/PropertyContext'
import Footer from '../components/layout/Footer'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import CitySelect from '../components/property/CitySelect'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import PropertyModal from '../components/property/PropertyModal'
import { DatabaseProperty } from '../components/property/types'

export default function HomePage() {
  const { t } = useTranslation()
  const { properties, filteredProperties, setFilteredProperties } = useProperties()
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.457273, 44.787197])
  const [selectedProperty, setSelectedProperty] = useState<DatabaseProperty | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setFilteredProperties(properties)
  }, [properties, setFilteredProperties])

  useEffect(() => {
    // Получаем параметр propertyId из URL
    const searchParams = new URLSearchParams(window.location.search)
    const propertyId = searchParams.get('propertyId')
    
    if (propertyId && properties.length > 0) {
      const foundProperty = properties.find(p => p.id === propertyId)
      if (foundProperty) {
        setSelectedProperty(foundProperty)
        setIsModalOpen(true)
      }
    }
  }, [properties])

  // Закрытие модального окна и очистка URL
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProperty(null)
    // Очищаем параметр propertyId из URL без перезагрузки страницы
    const url = new URL(window.location.href)
    url.searchParams.delete('propertyId')
    window.history.replaceState({}, '', url)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SEO 
        title={t('seo.homePageTitle')}
      />
      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-12">
        {/* Map section */}
        <div className="mb-8 sm:mb-24">
          <div className="mb-4 sm:mb-12">
            <QuickFilters />
          </div>
          <div className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div 
              className="flex items-center justify-between p-4 sm:p-8 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
            >
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-3">
                {t('common.objectsMap')}
                {isMapExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                )}
              </h2>
            </div>
            {isMapExpanded && (
              <div>
                <div className="px-4 sm:px-8 pb-2 sm:pb-4">
                  <CitySelect onCitySelect={({lng, lat}) => setMapCenter([lng, lat])} />
                </div>
                <div className="h-[400px] sm:h-[600px] relative z-0 rounded-b-3xl overflow-hidden">
                  <PropertyMap properties={filteredProperties} center={mapCenter} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Featured properties */}
        <div className="mb-8 sm:mb-24">
          <h3 className="text-lg sm:text-xl text-gray-900 mb-3 sm:mb-6">{t('common.newListings')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[...filteredProperties]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 9)
              .map((property) => (
              <div key={property.id} className="group bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 overflow-hidden">
                <PropertyCard
                  property={property}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
      {isModalOpen && selectedProperty && (
        <PropertyModal 
          property={selectedProperty} 
          open={isModalOpen} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  )
}
