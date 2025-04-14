import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { propertyService } from '../services/propertyService'
import { useCity } from './CityContext'

export type Property = {
  id: string
  title: string
  description: string
  type: 'sale' | 'rent'
  property_type: string
  price: number
  area: number
  rooms: number
  city_id: number
  images: string[]
  features: string[]
  created_at: string
  coordinates: {
    lat: number
    lng: number
  } | null
  status: 'active' | 'sold'
  location: string
  user_id: string | null
  city?: {
    id: number
    name: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  user?: {
    name: string | null
    phone: string | null
  }
}

interface PropertyContextType {
  properties: Property[]
  filteredProperties: Property[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  currentPage: number
  totalCount: number
  addProperty: (property: Omit<Property, 'id' | 'created_at'>) => Promise<Property>
  getPropertiesByType: (type: 'sale' | 'rent') => Property[]
  setFilteredProperties: (properties: Property[]) => void
  refreshProperties: (forceRefresh?: boolean) => Promise<void>
  loadMoreProperties: () => Promise<void>
  togglePropertyStatus: (propertyId: string) => Promise<void>
  activeSection: 'sale' | 'rent' | null
  setActiveSection: (section: 'sale' | 'rent' | null) => void
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined)

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(properties)
  const { selectedCity } = useCity()

  const togglePropertyStatus = async (propertyId: string) => {
    try {
      const property = properties.find(p => p.id === propertyId)
      if (!property) return

      const newStatus = property.status === 'sold' ? 'active' : 'sold'
      await propertyService.updateProperty(propertyId, { status: newStatus })

      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, status: newStatus } : p
      ))

      setFilteredProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, status: newStatus } : p
      ))
    } catch (error) {
      console.error('Error toggling property status:', error)
      throw error
    }
  }

  const addProperty = async (newProperty: Omit<Property, 'id' | 'created_at'>) => {
    try {
      const property = await propertyService.createProperty({
        ...newProperty,
        property_type: newProperty.property_type
      })
      setProperties(prev => [property, ...prev])
      return property
    } catch (error) {
      console.error('Error adding property:', error)
      throw error
    }
  }

  const getPropertiesByType = (type: 'sale' | 'rent') => {
    // Фильтрация по типу и городу, если город выбран
    return properties.filter((property: Property) => {
      // Фильтр по типу транзакции (продажа/аренда)
      const typeMatch = property.type === type
      
      // Если город не выбран - показываем все объявления
      if (!selectedCity) {
        return typeMatch
      }
      
      // Если город выбран - фильтруем по городу
      return typeMatch && property.city_id === selectedCity.id
    })
  }

  // Добавляем состояние для текущего активного раздела
  // Это позволит сохранять тип фильтрации при обновлении страницы
  const [activeSection, setActiveSection] = useState<'sale' | 'rent' | null>(null)

  // Загрузка свойств с учетом пагинации
  const loadProperties = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // Сбрасываем состояние пагинации при обновлении
      setCurrentPage(1)
      
      // Получаем количество объектов
      const count = await propertyService.getTotalCount(forceRefresh)
      setTotalCount(count)
      
      // Загружаем первую страницу
      const data = await propertyService.getProperties(1, 20, forceRefresh)
      setProperties(data)
      
      // Проверяем, есть ли еще данные для загрузки
      // Если загружено меньше записей, чем всего доступно, то есть еще данные
      setHasMore(data.length < count && data.length > 0)
      
      // Фильтруем данные по типу и городу
      let filteredData = data;
      
      // Если есть активный раздел, фильтруем по типу
      if (activeSection) {
        console.log(`Фильтруем по типу: ${activeSection}`);
        filteredData = filteredData.filter((property: Property) => property.type === activeSection);
      }
      
      // Если есть выбранный город, дополнительно фильтруем по городу
      if (selectedCity) {
        console.log(`Фильтруем по городу: ${selectedCity.name}`);
        filteredData = filteredData.filter((property: Property) => property.city_id === selectedCity.id);
      }
      
      // Устанавливаем отфильтрованные данные
      console.log(`Отфильтрованные объявления: ${filteredData.length}`);
      setFilteredProperties(filteredData);
    } catch (error) {
      console.error('Ошибка при загрузке объектов недвижимости:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Загрузка следующей страницы
  const loadMoreProperties = async () => {
    // Проверяем, есть ли еще данные для загрузки и не выполняется ли уже загрузка
    if (loadingMore || !hasMore || properties.length >= totalCount) return
    
    try {
      setLoadingMore(true)
      
      // Увеличиваем номер страницы
      const nextPage = currentPage + 1
      
      // Загружаем следующую страницу
      const newData = await propertyService.getProperties(nextPage, 20)
      
      // Обновляем состояние
      setProperties(prev => [...prev, ...newData])
      setCurrentPage(nextPage)
      
      // Проверяем, есть ли еще данные для загрузки
      // Если новых данных нет или мы достигли общего количества, больше не загружаем
      const newTotal = properties.length + newData.length;
      setHasMore(newData.length > 0 && newTotal < totalCount)
      
      // Применяем фильтрацию
      if (selectedCity) {
        setFilteredProperties(prev => [
          ...prev, 
          ...newData.filter((property: Property) => property.city_id === selectedCity.id)
        ])
      } else {
        setFilteredProperties(prev => [...prev, ...newData])
      }
    } catch (error) {
      console.error('Ошибка при загрузке дополнительных объектов:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [])
  
  // Обновляем фильтрацию при изменении выбранного города
  useEffect(() => {
    // Если еще нет загруженных свойств - ничего не делаем
    if (properties.length === 0) return
    
    if (selectedCity) {
      setFilteredProperties(properties.filter((property: Property) => property.city_id === selectedCity.id))
    } else {
      setFilteredProperties(properties)
    }
  }, [selectedCity, properties])

  return (
    <PropertyContext.Provider value={{
      properties,
      filteredProperties,
      loading,
      loadingMore,
      hasMore,
      currentPage,
      totalCount,
      setFilteredProperties,
      addProperty,
      getPropertiesByType,
      refreshProperties: loadProperties,
      loadMoreProperties,
      togglePropertyStatus,
      activeSection,
      setActiveSection
    }}>
      {children}
    </PropertyContext.Provider>
  )
}

export function useProperties() {
  const context = useContext(PropertyContext)
  if (context === undefined) {
    throw new Error('useProperties must be used within a PropertyProvider')
  }
  return context
}
