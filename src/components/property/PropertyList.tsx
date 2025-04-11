import PropertyCard from './PropertyCard'
import CompactPropertyCard from './CompactPropertyCard'
import ViewToggle from '../layout/ViewToggle'
import { Property } from '../../contexts/PropertyContext'
import { useViewMode } from '../../contexts/ViewModeContext'

interface PropertyListProps {
  properties: Property[]
  loading: boolean
}

export default function PropertyList({ properties, loading }: PropertyListProps) {
  // Используем глобальный контекст для режима просмотра
  const { viewMode, setViewMode } = useViewMode()

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-500">Загрузка объявлений...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Переключатель режима отображения */}
      <div className="flex justify-end mb-4">
        <ViewToggle view={viewMode} onChange={setViewMode} />
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {properties.map((property) => (
            <CompactPropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      )}
    </div>
  )
}
