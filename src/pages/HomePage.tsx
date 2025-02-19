import { useEffect, useState } from 'react'
import PropertyCard from '../components/property/PropertyCard'
import PropertyMap from '../components/property/PropertyMap'
import QuickFilters from '../components/property/QuickFilters'
import AddProperty from '../components/property/AddProperty'
import { useProperties } from '../contexts/PropertyContext'
import Footer from '../components/layout/Footer'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

export default function HomePage() {
  const { properties, filteredProperties, loading, setFilteredProperties } = useProperties()
  const [isMapExpanded, setIsMapExpanded] = useState(false)

  useEffect(() => {
    setFilteredProperties(properties)
  }, [properties, setFilteredProperties])

  return (
    <>
      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Map section */}
        <div className="mb-16">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Быстрый поиск
            </h2>
            <QuickFilters />
          </div>
          <div className="border rounded-2xl overflow-hidden shadow-sm">
            <div 
              className="flex items-center justify-between p-4 bg-white cursor-pointer"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
            >
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                Карта объектов
                {isMapExpanded ? (
                  <ChevronUpIcon className="w-6 h-6 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-6 h-6 text-gray-400" />
                )}
              </h2>
              <AddProperty />
            </div>
            {isMapExpanded && (
              <div className="h-[400px] relative z-0">
                <PropertyMap properties={filteredProperties} />
              </div>
            )}
          </div>
        </div>

        {/* Featured properties */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Новые объявления
              </h2>
              <p className="mt-1 text-gray-500">
                Последние добавленные объекты недвижимости
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...filteredProperties]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 9)
              .map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
