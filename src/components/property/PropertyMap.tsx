import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Property } from '../../contexts/PropertyContext'

interface PropertyMapProps {
  properties?: Property[]
  center?: [number, number]
  zoom?: number
}

export default function PropertyMap({ 
  properties = [], 
  center = [20.457273, 44.787197], // Белград по умолчанию
  zoom = 12 
}: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: center,
      zoom: zoom
    })

    map.current.addControl(new maplibregl.NavigationControl())

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  // Обновляем маркеры при изменении properties
  useEffect(() => {
    if (!map.current) return

    // Удаляем старые маркеры
    markers.current.forEach(marker => marker.remove())
    markers.current = []

    // Добавляем новые маркеры
    properties.forEach(property => {
      if (property.coordinates) {
        const marker = new maplibregl.Marker()
          .setLngLat([property.coordinates.lng, property.coordinates.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25 })
              .setHTML(
                `<div>
                  <h3 class="font-medium">${property.title}</h3>
                  <p class="text-sm text-gray-500">${property.location}</p>
                  <p class="text-sm font-medium mt-1">${property.price.toLocaleString()} €${property.type === 'rent' ? '/мес' : ''}</p>
                </div>`
              )
          )
          .addTo(map.current)
        
        markers.current.push(marker)
      }
    })
  }, [properties])

  return (
    <div ref={mapContainer} className="w-full h-full" />
  )
}
