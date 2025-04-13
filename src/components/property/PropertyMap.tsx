import { useRef, useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Property } from '../../contexts/PropertyContext'
import { useCity } from '../../contexts/CityContext'
import { useTranslation } from 'react-i18next'

interface PropertyMapProps {
  properties?: Property[]
  center?: [number, number]
  zoom?: number
  onMarkerPlace?: (coordinates: { lng: number; lat: number }) => void
  allowMarkerPlacement?: boolean
  className?: string
}

export default function PropertyMap({ 
  properties = [], 
  center = [20.457273, 44.787197], // Белград по умолчанию
  zoom = 12,
  onMarkerPlace,
  allowMarkerPlacement = false,
  className
}: PropertyMapProps) {
  const { selectedCity } = useCity()
  const { t } = useTranslation()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const popups = useRef<maplibregl.Popup[]>([])

  useEffect(() => {
    // Если контейнер не готов, прерываем
    if (!mapContainer.current) return
    
    // Если город не выбран и не в режиме размещения маркера и нет свойств
    if (!selectedCity && !allowMarkerPlacement && properties.length === 0) return
    
    // Используем заданные координаты (для модального окна), если есть
    // Если координаты не заданы явно, то используем координаты выбранного города (для списка объявлений)
    let mapCenter: [number, number] = center
    
    // Если в модальном окне переданы явные координаты, используем их
    if (!Array.isArray(center) || center.length !== 2) {
      // Невалидный формат center, используем координаты города или умолчание
      if (selectedCity && selectedCity.coordinates) {
        mapCenter = [selectedCity.coordinates.lng, selectedCity.coordinates.lat] as [number, number]
      }
    } else {
      // Центр явно задан, используем его
      mapCenter = center
    }

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
      center: mapCenter,
      zoom: zoom
    })

    map.current.addControl(new maplibregl.NavigationControl())

    // Дожидаемся загрузки стиля карты перед добавлением маркера
    map.current.on('load', () => {
      // Создаем изображение для маркера
      const markerImage = new Image(20, 20)
      markerImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="8" fill="#10B981"/>
          <circle cx="10" cy="10" r="4" fill="#F0FDF4"/>
        </svg>
      `)

      markerImage.onload = () => {
        try {
          if (map.current && !map.current.hasImage('custom-marker')) {
            map.current.addImage('custom-marker', markerImage)
          }
        } catch (error) {
          console.error('Error adding marker image:', error)
        }
      }

      // Обработка отсутствующих иконок
      map.current?.on('styleimagemissing', (e) => {
        try {
          const id = e.id
          if (map.current && !map.current.hasImage(id)) {
            map.current.addImage(id, markerImage)
          }
        } catch (error) {
          console.error('Error handling missing style image:', error)
        }
      })

      // Добавляем маркер для режима редактирования
      if (allowMarkerPlacement && properties.length === 1 && properties[0].coordinates && map.current) {
        const editMarker = new maplibregl.Marker({ draggable: true })
          .setLngLat([properties[0].coordinates.lng, properties[0].coordinates.lat])
          .addTo(map.current)

        editMarker.on('dragend', () => {
          const lngLat = editMarker.getLngLat()
          onMarkerPlace?.({ lng: lngLat.lng, lat: lngLat.lat })
        })

        markers.current.push(editMarker)
      }
    })

    if (allowMarkerPlacement && map.current) {
      map.current.on('click', (e) => {
        // Удаляем предыдущий маркер в режиме редактирования
        markers.current.forEach(marker => marker.remove())
        markers.current = []

        const coordinates = {
          lng: e.lngLat.lng,
          lat: e.lngLat.lat
        }

        // Создаем новый перетаскиваемый маркер
        if (map.current) {
          const newMarker = new maplibregl.Marker({ draggable: true })
            .setLngLat([coordinates.lng, coordinates.lat])
            .addTo(map.current)

          newMarker.on('dragend', () => {
            const lngLat = newMarker.getLngLat()
            onMarkerPlace?.({ lng: lngLat.lng, lat: lngLat.lat })
          })

          markers.current.push(newMarker)
          onMarkerPlace?.(coordinates)
        }
      })
    }

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  // Update map center, zoom, and markers when props change or selected city changes
  useEffect(() => {
    if (!map.current) return
    
    // Используем координаты выбранного города, если они есть
    const mapCenter: [number, number] = selectedCity && selectedCity.coordinates 
      ? [selectedCity.coordinates.lng, selectedCity.coordinates.lat] as [number, number]
      : center

    // Update center and zoom
    map.current.flyTo({
      center: mapCenter,
      zoom: zoom,
      essential: true,
      duration: 0
    })

    // Force map resize
    map.current.resize()
  }, [center, zoom])

  // Update markers separately from center/zoom
  useEffect(() => {
    if (!map.current) return

    // Remove old markers and popups
    markers.current.forEach(marker => marker.remove())
    popups.current.forEach(popup => popup.remove())
    markers.current = []
    popups.current = []

    // Add new markers
    properties.forEach(property => {
      if (property.coordinates && map.current) {
        try {
          // Create marker first
          const marker = new maplibregl.Marker({
            draggable: allowMarkerPlacement
          })
          .setLngLat([property.coordinates.lng, property.coordinates.lat])
          .addTo(map.current)

          if (allowMarkerPlacement) {
            marker.on('dragend', () => {
              const lngLat = marker.getLngLat()
              onMarkerPlace?.({ lng: lngLat.lng, lat: lngLat.lat })
            })
          }

          // Create and setup popup
          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '300px',
            className: 'property-popup',
            offset: [0, -30] // Offset from the marker
          })

          const popupContent = document.createElement('div')
          popupContent.className = 'property-popup-content'
          popupContent.style.width = '250px'
          popupContent.innerHTML = `
            <div class="cursor-pointer">
              <img src="${property.images?.[0] || '/placeholder.jpg'}" alt="${property.title}" class="w-full h-32 object-cover rounded-t-lg" />
              <div class="p-2 bg-white rounded-b-lg">
                <p class="font-semibold">${property.price ? property.price.toLocaleString() : 'Цена не указана'} ${property.price ? `€${property.type === 'rent' ? '/мес' : ''}` : ''}</p>
                <p class="text-sm text-gray-600 truncate">${property.title}</p>
              </div>
            </div>
          `

          // Add click event to popup content
          popupContent.addEventListener('click', () => {
            const propertyCards = document.querySelectorAll(`[data-property-id="${property.id}"]`)
            if (propertyCards.length > 0) {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              })
              propertyCards[0].dispatchEvent(clickEvent)
            }
          })

          // Set popup content and bind to marker
          popup.setDOMContent(popupContent)
          marker.setPopup(popup)

          markers.current.push(marker)
          popups.current.push(popup)
        } catch (error) {
          console.error('Error creating marker or popup:', error)
        }
      }
    })
  }, [properties, allowMarkerPlacement, onMarkerPlace])

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        map.current.resize()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Если город не выбран и не находимся в режиме размещения маркера И у нас нет объектов с координатами
  // показываем сообщение вместо карты
  if (!selectedCity && !allowMarkerPlacement && (!properties || properties.length === 0 || !properties.some(p => p.coordinates))) {
    return (
      <div className="w-full h-96 rounded-md overflow-hidden shadow-md flex flex-col items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <h3 className="text-lg font-medium text-gray-700 mb-2">{t('map.selectCityFirst')}</h3>
          <p className="text-gray-500">{t('map.citySelectionHelp')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className || "w-full h-96 rounded-md overflow-hidden shadow-md"}>
      <div ref={mapContainer} className="w-full h-full"></div>
    </div>
  )
}