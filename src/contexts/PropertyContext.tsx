import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { propertyService } from '../services/propertyService'
import type { Database } from '../lib/database.types'

export type Property = {
  id: string
  title: string
  description: string
  type: 'sale' | 'rent'
  property_type: string
  price: number
  area: number
  rooms: number
  location: string
  images: string[]
  features?: string[]
  created_at: string
  coordinates?: {
    lat: number
    lng: number
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
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined)

export function PropertyProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(properties)

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
      refreshProperties: loadProperties
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
