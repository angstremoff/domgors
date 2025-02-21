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
    <div className="min-h-screen bg-gray-100">
      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Map section */}
        <div className="mb-24">
          <div className="mb-12">
            <QuickFilters />
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
              <div className="h-[600px] relative z-0 rounded-b-3xl overflow-hidden">
                <PropertyMap properties={filteredProperties} />
              </div>
            )}
          </div>
        </div>

        {/* Featured properties */}
        <div className="mb-24">
          <h3 className="text-xl text-gray-900 mb-6">Новые объявления</h3>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  )
}
