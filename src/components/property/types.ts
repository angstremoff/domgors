import { Database } from '../../lib/database.types'
import { Property as ContextProperty } from '../../contexts/PropertyContext'

export type DatabaseProperty = Database['public']['Tables']['properties']['Row'] & {
  user?: {
    name: string | null
    phone: string | null
  } | null
  coordinates: {
    lat: number
    lng: number
  } | null
  city?: {
    id: number
    name: string
    coordinates?: {
      lat: number
      lng: number
    }
  } | null
}

export type PropertyModalProps = {
  property: DatabaseProperty
  open: boolean
  onClose: () => void
}

export type { ContextProperty }