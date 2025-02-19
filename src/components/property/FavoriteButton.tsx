import { useState } from 'react'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useFavorites } from '../../contexts/FavoritesContext'

interface FavoriteButtonProps {
  propertyId: string
}

export default function FavoriteButton({ propertyId }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsToggling(true)
    try {
      await toggleFavorite(propertyId)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`p-2 rounded-full bg-white/90 backdrop-blur-md 
                 hover:bg-white transition-colors duration-200
                 ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isToggling ? (
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-solid border-indigo-600 border-r-transparent" />
      ) : isFavorite(propertyId) ? (
        <HeartIconSolid className="w-4 h-4 text-red-500" />
      ) : (
        <HeartIcon className="w-4 h-4 text-gray-600" />
      )}
    </button>
  )
}
