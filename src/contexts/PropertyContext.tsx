import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { propertyService } from '../services/propertyService'

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
    return properties.filter(property => property.type === type)
  }

  const loadProperties = async () => {
    try {
      const data = await propertyService.getProperties()
      setProperties(data)
      setFilteredProperties(data)
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProperties()
  }, [])

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
