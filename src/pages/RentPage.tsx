import PropertyMap from '../components/property/PropertyMap'
import PropertyFilters from '../components/property/PropertyFilters'
import PropertyList from '../components/property/PropertyList'
import { useState, useEffect } from 'react'
import { useProperties } from '../contexts/PropertyContext'
import { useSearchParams } from 'react-router-dom'
import Footer from '../components/layout/Footer'

import type { Property } from '../contexts/PropertyContext'

export default function RentPage() {
  const { properties, filteredProperties, setFilteredProperties } = useProperties()
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  
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
              <div className="bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200">
                <div className="h-[400px] relative z-0">
                  <PropertyMap properties={filteredProperties} />
                </div>
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
