import PropertySearch from '../components/property/PropertySearch'
import PropertyCard from '../components/property/PropertyCard'
import PropertyMap from '../components/property/PropertyMap'
import PropertyFilters from '../components/property/PropertyFilters'
import AddProperty from '../components/property/AddProperty'
import { useProperties } from '../contexts/PropertyContext'

export default function HomePage() {
  const { properties, filteredProperties, loading } = useProperties()

  return (
    <>
      <PropertySearch />

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Map section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-8">
              <h2 className="text-2xl font-semibold text-gray-900">
                Карта объектов
              </h2>
              <PropertyFilters />
            </div>
            <AddProperty />
          </div>
          <div className="rounded-2xl overflow-hidden h-[400px] shadow-sm relative z-0">
            <PropertyMap properties={filteredProperties} />
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
              .slice(0, 10)
              .map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
