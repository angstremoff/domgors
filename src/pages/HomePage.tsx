import { useEffect, useState } from 'react'
import PropertyCard from '../components/property/PropertyCard'
import CompactPropertyCard from '../components/property/CompactPropertyCard'
import PropertyMap from '../components/property/PropertyMap'
import QuickFilters from '../components/property/QuickFilters'
import { useProperties } from '../contexts/PropertyContext'
import { useCity } from '../contexts/CityContext'
import Footer from '../components/layout/Footer'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import PropertyModal from '../components/property/PropertyModal'
import { DatabaseProperty } from '../components/property/types'
import ViewToggle from '../components/layout/ViewToggle'
import { useViewMode } from '../contexts/ViewModeContext'

export default function HomePage() {
  const { t } = useTranslation()
  const { properties, filteredProperties, setFilteredProperties } = useProperties()
  const { selectedCity } = useCity() 
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.457273, 44.787197])
  const [mapZoom, setMapZoom] = useState<number>(11)
  const [selectedProperty, setSelectedProperty] = useState<DatabaseProperty | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Используем глобальный контекст для режима просмотра
  const { viewMode, setViewMode } = useViewMode()

  useEffect(() => {
    if (selectedCity) {
      setFilteredProperties(properties.filter(p => p.city_id === selectedCity.id))
      
      // Устанавливаем центр карты на выбранный город
      if (selectedCity.coordinates) {
        setMapCenter([selectedCity.coordinates.lng, selectedCity.coordinates.lat])
        setMapZoom(12)
      }
    } else {
      setFilteredProperties(properties)
    }
  }, [properties, setFilteredProperties, selectedCity])

  useEffect(() => {
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

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProperty(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('propertyId')
    window.history.replaceState({}, '', url)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SEO 
        title={t('seo.homePageTitle')}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sr-only">
          {t('seo.homePageTitle')}
        </h1>
        <div className="mb-4 sm:mb-12">
          <div className="mb-4 sm:mb-12">
            <QuickFilters />
          </div>
          <div className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
            <div 
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors"
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
              <PropertyMap 
                properties={filteredProperties} 
                center={mapCenter} 
                zoom={mapZoom} 
                className="h-[400px] sm:h-[500px] rounded-b-3xl overflow-hidden"
              />
            )}
          </div>
        </div>
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t('common.newListings')}</h2>
            <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...filteredProperties]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 9)
                .map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...filteredProperties]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 9)
                .map((property) => (
                  <CompactPropertyCard key={property.id} property={property} />
                ))}
            </div>
          )}
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
