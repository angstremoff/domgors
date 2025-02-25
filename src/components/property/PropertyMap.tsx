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
        <circle cx="10" cy="10" r="8" fill="#10B981"/>
        <circle cx="10" cy="10" r="4" fill="#F0FDF4"/>
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
          .addTo(map.current!)
        markers.current.push(marker)
      }
    })

    // Центрируем карту на первом маркере, если он есть
    if (properties.length === 1 && properties[0].coordinates) {
      map.current.flyTo({
        center: [properties[0].coordinates.lng, properties[0].coordinates.lat],
        zoom: 15,
        essential: true
      })
    }
  }, [properties])

  return <div ref={mapContainer} className="w-full h-full" />
}
