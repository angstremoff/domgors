import { useEffect } from 'react'
import { useProperties } from '../contexts/PropertyContext'
import { useFavorites } from '../contexts/FavoritesContext'
import PropertyCard from '../components/property/PropertyCard'

export default function FavoritesPage() {
  const { properties, refreshProperties } = useProperties()
  const { favorites, isLoading } = useFavorites()

  useEffect(() => {
    refreshProperties()
  }, [])

  const favoriteProperties = properties.filter(property => 
    favorites.includes(property.id)
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Избранные объявления</h1>
      
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-500">Загрузка избранного...</p>
        </div>
      ) : favoriteProperties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">У вас пока нет избранных объявлений</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteProperties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}
