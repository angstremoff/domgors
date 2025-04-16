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
  // Используем localStorage для сохранения типа фильтрации между сессиями
  const [activeSection, setActiveSection] = useState<'sale' | 'rent' | null>(() => {
    // Попытка восстановить раздел из localStorage
    try {
      const savedSection = localStorage.getItem('domgo_active_section');
      console.log('Загружен раздел из localStorage:', savedSection);
      return (savedSection === 'sale' || savedSection === 'rent') ? savedSection : null;
    } catch (e) {
      console.error('Ошибка при чтении из localStorage:', e);
      return null;
    }
  })

  // Используем обертку для setActiveSection, чтобы также сохранять в localStorage
  const updateActiveSection = (section: 'sale' | 'rent' | null) => {
    try {
      if (section) {
        localStorage.setItem('domgo_active_section', section);
        console.log('Сохранен раздел в localStorage:', section);
      } else {
        localStorage.removeItem('domgo_active_section');
        console.log('Удален раздел из localStorage');
      }
      setActiveSection(section);
      
      // Только выполняем базовую фильтрацию по типу без применения дополнительных фильтров
      if (properties.length > 0 && section) {
        // Фильтруем только по типу, без применения других фильтров
        console.log('Применяем базовую фильтрацию по типу:', section);
        let typeFilteredData = properties.filter(property => property.type === section);
        
        // Если выбран город, также фильтруем по городу
        if (selectedCity) {
          typeFilteredData = typeFilteredData.filter(property => property.city_id === selectedCity.id);
        }
        
        console.log('Количество объявлений после базовой фильтрации:', typeFilteredData.length);
        setFilteredProperties(typeFilteredData);
      }
    } catch (e) {
      console.error('Ошибка при записи в localStorage:', e);
      setActiveSection(section);
    }
  };
  
  // Функция для применения фильтров на основе текущего состояния
  const applyFilters = () => {
    console.log('Применяем фильтры, активный раздел:', activeSection);
    
    // Проверяем, есть ли данные для фильтрации
    if (properties.length === 0) {
      console.log('Нет данных для фильтрации');
      setFilteredProperties([]);
      return;
    }

    // Создаем копию массива для фильтрации
    let filteredData = [...properties];
    
    // Фильтруем по типу, если задан активный раздел
    if (activeSection) {
      console.log(`Фильтруем по типу: ${activeSection}, всего объектов до фильтрации: ${filteredData.length}`);
      filteredData = filteredData.filter((property: Property) => property.type === activeSection);
      console.log(`После фильтрации по типу: ${filteredData.length}`);
    }
    
    // Фильтруем по городу, если выбран город
    if (selectedCity) {
      console.log(`Фильтруем по городу: ${selectedCity.name}`);
      filteredData = filteredData.filter((property: Property) => property.city_id === selectedCity.id);
    }
    
    console.log(`Итогово отфильтровано объявлений: ${filteredData.length}`);
    setFilteredProperties(filteredData);
  };

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
      
      // Применяем только базовые фильтры после загрузки данных
      console.log('Данные загружены, применяем базовые фильтры');
      // Если есть активный раздел, отфильтруем только по типу и городу
      if (activeSection) {
        let typeFilteredData = data.filter((property: Property) => property.type === activeSection);
        if (selectedCity) {
          typeFilteredData = typeFilteredData.filter((property: Property) => property.city_id === selectedCity.id);
        }
        setFilteredProperties(typeFilteredData);
        console.log(`После базовой фильтрации по типу ${activeSection} осталось ${typeFilteredData.length} объявлений`);
      } else {
        // Если нет активного раздела, показываем все объявления
        setFilteredProperties(data);
      }
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

  // Применяем фильтры при изменении выбранного города
  useEffect(() => {
    if (properties.length > 0) {
      applyFilters();
    }
  }, [selectedCity]);

  // Применяем фильтры при изменении активного раздела
  useEffect(() => {
    if (properties.length > 0) {
      applyFilters();
    }
  }, [activeSection, properties.length]);

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
      setActiveSection: updateActiveSection // Используем обертку для сохранения в localStorage
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
