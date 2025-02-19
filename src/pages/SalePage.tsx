import PropertyMap from '../components/property/PropertyMap'
import PropertyFilters from '../components/property/PropertyFilters'
import PropertyList from '../components/property/PropertyList'
import { useState, useEffect } from 'react'
import { useProperties } from '../contexts/PropertyContext'

interface Property {
  id: string
  title: string
  price: number
  location: string
  type: 'rent' | 'sale'
  propertyType: string
  area: number
  rooms: number
  description: string
  images: string[]
}

export default function SalePage() {
  const { properties, filteredProperties, setFilteredProperties } = useProperties()
  const [loading, setLoading] = useState(true)
  
  // Инициализируем фильтрованные свойства при загрузке
  useEffect(() => {
    const saleProperties = properties.filter(p => p.type === 'sale')
    setFilteredProperties(saleProperties)
  }, [properties, setFilteredProperties])

  useEffect(() => {
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column - Map and Filters */}
          <div className="lg:w-[320px] xl:w-[380px] order-2 lg:order-1 flex-shrink-0">
            <div className="sticky top-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Фильтры
                </h2>
                <PropertyFilters type="sale" properties={properties.filter(p => p.type === 'sale')} />
              </div>
              
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="h-[300px] sm:h-[400px] lg:h-[600px] relative z-0">
                  <PropertyMap properties={properties} />
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Properties */}
          <div className="flex-1 order-1 lg:order-2">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              Продажа недвижимости
            </h1>

            <PropertyList properties={filteredProperties.filter(p => p.type === 'sale')} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}
