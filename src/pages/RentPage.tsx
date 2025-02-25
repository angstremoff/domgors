import PropertyMap from '../components/property/PropertyMap'
import PropertyFilters from '../components/property/PropertyFilters'
import PropertyList from '../components/property/PropertyList'
import { useState, useEffect } from 'react'
import { useProperties } from '../contexts/PropertyContext'
import { useSearchParams } from 'react-router-dom'
import Footer from '../components/layout/Footer'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import CitySelect from '../components/property/CitySelect'

import type { Property } from '../contexts/PropertyContext'

export default function RentPage() {
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/5">
            <div className="sticky top-6 space-y-8">
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-all duration-300">
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">Фильтры</h2>
                <PropertyFilters type="rent" properties={properties} />
              </div>
              <div className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200">
                <div 
                  className="flex items-center justify-between p-8 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                >
                  <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                    Карта объектов
                    {isMapExpanded ? (
                      <ChevronUpIcon className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </h2>
                </div>
                {isMapExpanded && (
                  <div>
                    <div className="px-8 pb-4">
                      <CitySelect onCitySelect={({lng, lat}) => setMapCenter([lng, lat])} />
                    </div>
                    <div className="h-[400px] relative z-0 rounded-b-3xl overflow-hidden">
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
