import { HeartIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useFavorites } from '../../contexts/FavoritesContext'

export default function FavoriteIcon() {
  const { favorites } = useFavorites()
  const count = favorites.length

  return (
    <Link
      to="/favorites"
      className="relative inline-flex items-center justify-center p-2 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2"
    >
      <HeartIcon className="h-6 w-6" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-secondary-600 rounded-full">
          {count}
        </span>
      )}
      <span className="sr-only">Избранное</span>
    </Link>
  )
}
