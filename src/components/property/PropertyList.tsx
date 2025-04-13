import { useEffect, useRef, useCallback } from 'react'
import PropertyCard from './PropertyCard'
import CompactPropertyCard from './CompactPropertyCard'
import ViewToggle from '../layout/ViewToggle'
import { Property } from '../../contexts/PropertyContext'
import { useViewMode } from '../../contexts/ViewModeContext'

interface PropertyListProps {
  properties: Property[]
  loading: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export default function PropertyList({ 
  properties, 
  loading, 
  loadingMore = false, 
  hasMore = false, 
  onLoadMore = () => {}
}: PropertyListProps) {
  // Используем глобальный контекст для режима просмотра
  const { viewMode, setViewMode } = useViewMode()
  
  // Создаем ref для элемента бесконечной прокрутки
  const observerRef = useRef<HTMLDivElement>(null)
  
  // Функция для отслеживания пересечения элемента
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      // Когда элемент становится видимым и есть еще страницы, загружаем их
      if (entry?.isIntersecting && hasMore && !loadingMore) {
        onLoadMore()
      }
    },
    [hasMore, loadingMore, onLoadMore]
  )
  
  // Инициализируем IntersectionObserver
  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 // Когда 50% элемента видно
    }
    
    const observer = new IntersectionObserver(handleObserver, option)
    
    if (observerRef.current) {
      observer.observe(observerRef.current)
    }
    
    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current)
      }
    }
  }, [handleObserver, properties.length])

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
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {properties.map((property) => (
            <CompactPropertyCard
              key={property.id}
              property={property}
            />
          ))}
        </div>
      )}
      
      {/* Элемент для отслеживания бесконечной прокрутки */}
      <div ref={observerRef} className="h-10 w-full mt-4">
        {loadingMore && (
          <div className="flex justify-center items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="ml-2 text-gray-500">Загрузка еще...</p>
          </div>
        )}
      </div>
    </div>
  )
}
