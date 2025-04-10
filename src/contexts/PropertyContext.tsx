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
  addProperty: (property: Omit<Property, 'id' | 'created_at'>) => Promise<Property>
  getPropertiesByType: (type: 'sale' | 'rent') => Property[]
  setFilteredProperties: (properties: Property[]) => void
  refreshProperties: () => Promise<void>
  togglePropertyStatus: (propertyId: string) => Promise<void>
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined)

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
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
    return properties.filter(property => {
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

  const loadProperties = async () => {
    try {
      const data = await propertyService.getProperties()
      setProperties(data)
      // Применяем фильтрацию по городу при загрузке данных
      if (selectedCity) {
        setFilteredProperties(data.filter(property => property.city_id === selectedCity.id))
      } else {
        setFilteredProperties(data)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
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
      setFilteredProperties(properties.filter(property => property.city_id === selectedCity.id))
    } else {
      setFilteredProperties(properties)
    }
  }, [selectedCity, properties])

  return (
    <PropertyContext.Provider value={{
      properties,
      filteredProperties,
      loading,
      addProperty,
      getPropertiesByType,
      setFilteredProperties,
      refreshProperties: loadProperties,
      togglePropertyStatus
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
