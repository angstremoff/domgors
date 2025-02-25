import { useRef, useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Property } from '../../contexts/PropertyContext'
import PropertyCard from './PropertyCard'

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
  const popups = useRef<maplibregl.Popup[]>([])

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

    // Удаляем старые маркеры и попапы
    markers.current.forEach(marker => marker.remove())
    popups.current.forEach(popup => popup.remove())
    markers.current = []
    popups.current = []

    // Добавляем новые маркеры
    properties.forEach(property => {
      if (property.coordinates) {
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px',
          className: 'property-popup'
        })

        const popupContent = document.createElement('div')
        popupContent.className = 'property-popup-content'
        popupContent.style.width = '250px'
        popupContent.innerHTML = `
          <div class="cursor-pointer">
            <img src="${property.images?.[0] || '/placeholder.jpg'}" alt="${property.title}" class="w-full h-32 object-cover rounded-t-lg" />
            <div class="p-2 bg-white rounded-b-lg">
              <p class="font-semibold">${property.price.toLocaleString()} €${property.type === 'rent' ? '/мес' : ''}</p>
              <p class="text-sm text-gray-600 truncate">${property.title}</p>
            </div>
          </div>
        `

        popup.setDOMContent(popupContent)

        // Add click event to popup content
        popupContent.addEventListener('click', () => {
          // Find and click the property card that matches this property
          const propertyCards = document.querySelectorAll(`[data-property-id="${property.id}"]`)
          if (propertyCards.length > 0) {
            // Create a click event to simulate opening the modal
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            })
            // Trigger the click event on the first matching property card
            propertyCards[0].dispatchEvent(clickEvent)
          }
        })

        const marker = new maplibregl.Marker()
          .setLngLat([property.coordinates.lng, property.coordinates.lat])
          .setPopup(popup)
          .addTo(map.current)

        markers.current.push(marker)
        popups.current.push(popup)
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

  // Add effect to handle center changes
  useEffect(() => {
    if (!map.current) return

    map.current.flyTo({
      center: center,
      zoom: zoom,
      essential: true
    })
  }, [center, zoom])

  return <div ref={mapContainer} className="w-full h-full" />
}
