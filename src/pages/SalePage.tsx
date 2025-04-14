import PropertyMap from '../components/property/PropertyMap'
import PropertyFilters from '../components/property/PropertyFilters'
import PropertyList from '../components/property/PropertyList'
import { useState, useEffect } from 'react'
import { useProperties } from '../contexts/PropertyContext'
import { useSearchParams } from 'react-router-dom'
import { useCity } from '../contexts/CityContext'
import Footer from '../components/layout/Footer'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO'
import Breadcrumbs from '../components/Breadcrumbs'

export default function SalePage() {
  const { t } = useTranslation();
  const { properties, filteredProperties, setFilteredProperties, setActiveSection } = useProperties()
  const { selectedCity } = useCity() // Добавляем доступ к выбранному городу
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.457273, 44.787197])
  const [mapZoom, setMapZoom] = useState<number>(11)
  
  // Устанавливаем активный раздел при загрузке страницы
  useEffect(() => {
    // Устанавливаем активный раздел 'sale' для страницы продажи
    console.log('Устанавливаем раздел "sale"');
    setActiveSection('sale');
  }, [setActiveSection])
  
  // Инициализируем карту при изменении города
  useEffect(() => {
    if (selectedCity && selectedCity.coordinates) {
      // Устанавливаем центр карты на выбранный город
      setMapCenter([selectedCity.coordinates.lng, selectedCity.coordinates.lat])
      setMapZoom(12)
    }
  }, [selectedCity])
  
  // Применяем дополнительные фильтры из URL-параметров
  useEffect(() => {
    const propertyType = searchParams.get('propertyType')
    if (propertyType) {
      // Фильтруем по типу недвижимости из URL
      const filtered = filteredProperties.filter(p => p.property_type === propertyType);
      setFilteredProperties(filtered);
    }
  }, [searchParams, filteredProperties, setFilteredProperties])

  useEffect(() => {
    setLoading(false)
  }, [])



  return (
    <div className="min-h-screen">
      <SEO 
        title={t('seo.salePageTitle')}
        canonicalUrl="https://domgo.rs/buy"
      />
      <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          <div className="lg:w-[30%]">
            <div className="sticky top-4 space-y-4 lg:space-y-8">
              <div className="rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <PropertyFilters type="sale" properties={properties} />
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
                  <div className="h-[250px] sm:h-[300px] lg:h-[400px] relative z-0 rounded-b-3xl overflow-hidden">
                    <PropertyMap properties={filteredProperties} center={mapCenter} zoom={mapZoom} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:w-[70%]">
            <PropertyList properties={filteredProperties} loading={loading} />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
