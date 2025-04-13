import { HeartIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useFavorites } from '../../contexts/FavoritesContext'
import { useProperties } from '../../contexts/PropertyContext'

interface FavoriteIconProps {
  /** Если true, компонент не будет использовать ссылку */
  noLink?: boolean;
  /** Дополнительные классы для корневого элемента */
  className?: string;
}

export default function FavoriteIcon({ noLink = false, className = '' }: FavoriteIconProps) {
  const { properties } = useProperties()
  const { getValidFavorites } = useFavorites()
  
  // Получаем только ID существующих объявлений
  const availablePropertyIds = properties.map(p => p.id)
  const validFavorites = getValidFavorites(availablePropertyIds)
  const count = validFavorites.length

  const defaultClassName = "relative inline-flex items-center justify-center p-2 text-white/80 hover:text-white focus:outline-none"
  const combinedClassName = `${defaultClassName} ${className}`
  
  // Содержимое компонента
  const content = (
    <>
      <HeartIcon className="h-6 w-6" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-secondary-600 rounded-full">
          {count}
        </span>
      )}
      <span className="sr-only">Избранное</span>
    </>
  )

  // Если noLink=true, не используем ссылку
  return noLink ? (
    <div className={combinedClassName}>
      {content}
    </div>
  ) : (
    <Link to="/favorites" className={`${combinedClassName} focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2`}>
      {content}
    </Link>
  )
}
