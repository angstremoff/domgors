import { HeartIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useFavorites } from '../../contexts/FavoritesContext'

export default function FavoriteIcon() {
  const { favorites } = useFavorites()
  const count = favorites.length

  return (
    <Link
      to="/favorites"
      className="rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 relative"
    >
      <HeartIcon className="h-6 w-6" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-indigo-600 rounded-full">
          {count}
        </span>
      )}
      <span className="sr-only">Избранное</span>
    </Link>
  )
}
