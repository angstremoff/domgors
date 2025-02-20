import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Property } from '../../contexts/PropertyContext'

interface PropertyMapProps {
  properties?: Property[]
  center?: [number, number]
  zoom?: number
  onMarkerPlace?: (coordinates: { lng: number; lat: number }) => void
  allowMarkerPlacement?: boolean
}

export default function PropertyMap({ 
  properties = [], 
  center = [20.457273, 44.787197], // Белград по умолчанию
  zoom = 12,
  onMarkerPlace,
  allowMarkerPlacement = false
}: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!mapContainer.current) return

    // Создаем пустое изображение для маркера
    const markerImage = new Image(20, 20)
    markerImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" fill="#4F46E5"/>
        <circle cx="10" cy="10" r="4" fill="white"/>
      </svg>
    `)

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
        }]
      },
      center: center,
      zoom: zoom
    })

    map.current.addControl(new maplibregl.NavigationControl())

    // Добавляем изображение маркера после загрузки
    markerImage.onload = () => {
      if (map.current && !map.current.hasImage('custom-marker')) {
        map.current.addImage('custom-marker', markerImage)
      }
    }

    // Обработка отсутствующих иконок
    map.current.on('styleimagemissing', (e) => {
      const id = e.id
      if (!map.current?.hasImage(id)) {
        map.current?.addImage(id, markerImage)
      }
    })

    if (allowMarkerPlacement) {
      map.current.on('click', (e) => {
        const coordinates = {
          lng: e.lngLat.lng,
          lat: e.lngLat.lat
        }
        onMarkerPlace?.(coordinates)
      })
    }

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
                `<div class="p-2 bg-white rounded shadow">
                  ${property.title ? `<h3 class="font-medium text-gray-900">${property.title}</h3>` : ''}
                  ${property.location ? `<p class="text-sm text-gray-500">${property.location}</p>` : ''}
                  ${property.price ? `<p class="text-sm font-medium mt-1 text-indigo-600">${property.price.toLocaleString()} €${property.type === 'rent' ? '/мес' : ''}</p>` : ''}
                </div>`
              )
          )
          .setPopup(
            new maplibregl.Popup({ offset: 25 })
              .setHTML(
                `<div>
                  ${property.title ? `<h3 class="font-medium">${property.title}</h3>` : ''}
                  ${property.location ? `<p class="text-sm text-gray-500">${property.location}</p>` : ''}
                  ${property.price ? `<p class="text-sm font-medium mt-1">${property.price.toLocaleString()} €${property.type === 'rent' ? '/мес' : ''}</p>` : ''}
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
