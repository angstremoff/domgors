import PropertyMap from '../components/property/PropertyMap'
import PropertyFilters from '../components/property/PropertyFilters'
import PropertyList from '../components/property/PropertyList'
import { useState, useEffect } from 'react'
import { useProperties } from '../contexts/PropertyContext'
import { useSearchParams } from 'react-router-dom'
import Footer from '../components/layout/Footer'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import CitySelect from '../components/property/CitySelect'
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO'

export default function RentPage() {
  const { t } = useTranslation();
  const { properties, filteredProperties, setFilteredProperties } = useProperties()
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.457273, 44.787197])
  
  // Инициализируем фильтрованные свойства при загрузке
  useEffect(() => {
    const propertyType = searchParams.get('propertyType')
    let rentProperties = properties.filter(p => p.type === 'rent')
    
    if (propertyType) {
      rentProperties = rentProperties.filter(p => p.property_type === propertyType)
    }
    
    setFilteredProperties(rentProperties)

    // Cleanup function to reset filters when component unmounts
    return () => {
      setFilteredProperties(properties)
    }
  }, [properties, setFilteredProperties, searchParams])

  useEffect(() => {
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <SEO 
        title={t('seo.rentPageTitle')}
        canonicalUrl="https://domgo.rs/rent"
      />
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          <div className="lg:w-2/5">
            <div className="sticky top-4 space-y-4 lg:space-y-8">
              <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-4 lg:mb-8">{t('common.filters')}</h2>
                <PropertyFilters type="rent" properties={properties} />
              </div>
              <div className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
                <div 
                  className="flex items-center justify-between p-4 sm:p-6 lg:p-8 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                >
                  <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 flex items-center gap-3">
                    {t('common.objectsMap')}
                    {isMapExpanded ? (
                      <ChevronUpIcon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400" />
                    )}
                  </h2>
                </div>
                {isMapExpanded && (
                  <div>
                    <div className="px-4 sm:px-6 lg:px-8 pb-4">
                      <CitySelect onCitySelect={({lng, lat}) => setMapCenter([lng, lat])} />
                    </div>
                    <div className="h-[250px] sm:h-[300px] lg:h-[400px] relative z-0 rounded-b-3xl overflow-hidden">
                      <PropertyMap properties={filteredProperties} center={mapCenter} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:w-3/5">
            <PropertyList properties={filteredProperties} loading={loading} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
