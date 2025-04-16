import { useRef, useEffect } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Property } from '../../contexts/PropertyContext'
import { useTranslation } from 'react-i18next'

interface PropertyMapProps {
  properties?: Property[]
  center?: [number, number]
  zoom?: number
  onMarkerPlace?: (coordinates: { lng: number; lat: number }) => void
  allowMarkerPlacement?: boolean
  className?: string
}

export default function PropertyMapForModal({ 
  properties = [], 
  center = [20.457273, 44.787197], // Белград по умолчанию
  zoom = 14, // Для модального окна увеличиваем зум по умолчанию
  onMarkerPlace,
  allowMarkerPlacement = false,
  className
}: PropertyMapProps) {
  const { t } = useTranslation()
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const popups = useRef<maplibregl.Popup[]>([])

  useEffect(() => {
    // Если контейнер не готов, прерываем
    if (!mapContainer.current) return
    
    // СПЕЦИАЛЬНАЯ ВЕРСИЯ ДЛЯ МОДАЛЬНОГО ОКНА
    // Всегда используем координаты объявления или явно переданные координаты
    
    // Белград по умолчанию, если ничего не задано
    let mapCenter: [number, number] = [20.457273, 44.787197]
    
    console.log('Модальное окно - переданный center prop:', center);
    
    // В модальном окне используем всегда только две опции:
    
    // 1. Если есть явный center в props (переданные координаты объявления)
    if (Array.isArray(center) && center.length === 2) {
      console.log('Модальное окно - используем явный center:', center);
      mapCenter = center;
    }
    // 2. Если есть координаты в первом объявлении в массиве properties
    else if (properties && properties.length > 0 && properties[0].coordinates) {
      console.log('Модальное окно - используем координаты объявления:', properties[0].coordinates);
      mapCenter = [properties[0].coordinates.lng, properties[0].coordinates.lat];
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
      if (!map.current) return
      
      // Добавляем маркеры для объявлений
      properties.forEach(property => {
        if (property.coordinates) {
          // Создаем HTML-элемент для маркера
          const el = document.createElement('div')
          el.className = 'custom-marker'
          el.style.width = '30px'
          el.style.height = '30px'
          el.style.borderRadius = '50%'
          el.style.backgroundColor = '#10B981' // Зеленый цвет
          el.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.2)'
          el.style.cursor = 'pointer'
          
          // Основной маркер
          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center'
          })
            .setLngLat([property.coordinates.lng, property.coordinates.lat])
            .addTo(map.current)
          
          markers.current.push(marker)
          
          // Создаем всплывающее окно
          if (property.title) {
            const popup = new maplibregl.Popup({
              offset: 25,
              closeButton: true,
              closeOnClick: true
            })
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold text-gray-900">${property.title}</h3>
                  <p class="text-gray-700">${property.price.toLocaleString()} €${property.type === 'rent' ? '/месяц' : ''}</p>
                </div>
              `)
            
            marker.setPopup(popup)
            popups.current.push(popup)
          }
        }
      })
      
      // Если позволено размещение маркера, добавляем обработчик события
      if (allowMarkerPlacement && onMarkerPlace) {
        map.current.on('click', (e) => {
          // При клике всплывает событие 'click', которое передает события выше
          // Нужно остановить всплытие, чтобы не закрывать модальное окно
          e.originalEvent.stopPropagation();
          
          // Очищаем предыдущие маркеры
          markers.current.forEach(marker => marker.remove())
          markers.current = []
          
          // Получаем координаты клика
          const lngLat = e.lngLat
          
          // Создаем HTML-элемент для маркера
          const el = document.createElement('div')
          el.className = 'custom-marker'
          el.style.width = '30px'
          el.style.height = '30px'
          el.style.borderRadius = '50%'
          el.style.backgroundColor = '#10B981' // Зеленый цвет
          el.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.2)'
          
          // Создаем новый маркер
          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center'
          })
            .setLngLat([lngLat.lng, lngLat.lat])
            .addTo(map.current)
          
          markers.current.push(marker)
          
          // Вызываем callback с координатами
          onMarkerPlace({
            lng: lngLat.lng,
            lat: lngLat.lat
          })
        })
      }
    })

    // Функция для изменения размера карты при изменении размера контейнера
    const resizeMap = () => {
      if (map.current) {
        map.current.resize()
      }
    }

    // Наблюдатель за изменениями размеров
    const observer = new ResizeObserver(resizeMap)
    if (mapContainer.current) {
      observer.observe(mapContainer.current)
    }

    return () => {
      // Очищаем карту при размонтировании компонента
      map.current?.remove()
      
      // Отключаем наблюдатель
      if (mapContainer.current) {
        observer.unobserve(mapContainer.current)
      }
      observer.disconnect()
      
      // Очищаем маркеры и попапы
      markers.current = []
      popups.current = []
    }
  }, [properties, center, zoom, allowMarkerPlacement, onMarkerPlace, t])

  return (
    <div
      ref={mapContainer}
      className={className || 'w-full h-full'}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
