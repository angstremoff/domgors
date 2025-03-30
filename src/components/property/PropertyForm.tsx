import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { compressImage } from '../../utils/imageCompression'

interface PropertyFormData {
  title: string
  description: string
  type: 'sale' | 'rent'
  property_type: string
  price: number
  area: number
  rooms: number
  location: string
  images: File[]
  features: string[]
  coordinates: { lat: number; lng: number } | null
  city_id: number | null
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function LocationMarker({ position, setPosition }: {
  position: { lat: number; lng: number } | null
  setPosition: (pos: { lat: number; lng: number }) => void
}) {
  const map = useMapEvents({
    click(e: L.LeafletMouseEvent) {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return position === null ? null : (
    <Marker position={position} icon={defaultIcon} />
  )
}

export default function PropertyForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [userData, setUserData] = useState({
    name: '',
    phone: ''
  })
  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    type: 'sale',
    property_type: 'apartment',
    price: 0,
    area: 0,
    rooms: 1,
    location: '',
    images: [],
    features: [],
    coordinates: null,
    city_id: null
  })

  useEffect(() => {
    // Загрузка данных пользователя при монтировании компонента
    const fetchUserData = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('name, phone')
            .eq('id', user.id)
            .single();
            
          if (data) {
            setUserData({
              name: data.name || '',
              phone: data.phone || ''
            });
          }
          
          if (error) throw error;
        } catch (error) {
          console.error('Ошибка при загрузке данных пользователя:', error);
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + formData.images.length > 10) {
      alert('Максимальное количество фотографий - 10')
      return
    }
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files].slice(0, 10)
    }))
  }, [formData.images])

  const handleLocationSelect = async (position: { lat: number; lng: number }) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${position.lat}&lon=${position.lng}&format=json`
      )
      const data = await response.json()
      
      // Извлекаем только название улицы из полного адреса
      const street = data.address?.road || data.address?.street || ''
      const houseNumber = data.address?.house_number || ''
      const location = street + (houseNumber ? `, ${houseNumber}` : '')

      setFormData(prev => ({
        ...prev,
        location: location,
        coordinates: position
      }))
    } catch (error) {
      console.error('Error fetching address:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Проверка обязательных полей пользователя
    if (!userData.name.trim()) {
      alert('Введите ваше имя')
      return
    }

    if (!userData.phone.trim()) {
      alert('Введите номер телефона')
      return
    }

    try {
      // Обновляем профиль пользователя
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: userData.name,
          phone: userData.phone
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Ошибка при обновлении профиля:', profileError)
        throw profileError
      }

      // Upload images
      const imageUrls = await Promise.all(
        formData.images.map(async (file) => {
          // Сжимаем изображение перед загрузкой
          const compressedFile = await compressImage(file, 0.3) // Сжимаем до 300 КБ
          
          const fileExt = compressedFile.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `properties/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('properties')
            .upload(filePath, compressedFile)

          if (uploadError) throw uploadError

          return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/properties/${fileName}`
        })
      )

      // Create property listing
      const { error } = await supabase.from('properties').insert({
        ...formData,
        images: imageUrls,
        user_id: user.id,
        status: 'active'
      })

      if (error) throw error

      navigate('/')
    } catch (error) {
      console.error('Error creating property:', error)
      alert('Ошибка при создании объявления')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Контактная информация</label>
        <div className="mt-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ваше имя</label>
            <input
              type="text"
              required
              value={userData.name}
              onChange={e => setUserData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Иван Иванов"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Ваш телефон</label>
            <input
              type="tel"
              required
              value={userData.phone}
              onChange={e => setUserData(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="+7 (999) 123-45-67"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Фотографии (до 10 шт.)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="mt-1 block w-full"
          disabled={formData.images.length >= 10}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {formData.images.map((file, index) => (
            <div key={index} className="relative w-24 h-24">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Заголовок</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Описание</label>
          <textarea
            required
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Тип объявления</label>
          <select
            value={formData.type}
            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'sale' | 'rent' }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="sale">Продажа</option>
            <option value="rent">Аренда</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Тип недвижимости</label>
          <select
            value={formData.property_type}
            onChange={e => setFormData(prev => ({ ...prev, property_type: e.target.value }))}            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="apartment">Квартира</option>
            <option value="house">Дом</option>
            <option value="commercial">Коммерческая недвижимость</option>
            {formData.type === 'sale' && <option value="land">Земельный участок</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Цена</label>
          <input
            type="number"
            required
            min="0"
            value={formData.price}
            onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Площадь (м²)</label>
          <input
            type="number"
            required
            min="0"
            value={formData.area}
            onChange={e => setFormData(prev => ({ ...prev, area: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Количество комнат</label>
          <input
            type="number"
            required
            min="1"
            value={formData.rooms}
            onChange={e => setFormData(prev => ({ ...prev, rooms: Number(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Расположение на карте</label>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <MapContainer
              center={[44.787197, 20.457273]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker
                position={formData.coordinates}
                setPosition={handleLocationSelect}
              />
            </MapContainer>
          </div>
          {formData.location && (
            <div className="mt-2 text-sm text-gray-500">
              Выбранный адрес: {formData.location}
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
      >
        Создать объявление
      </button>
    </form>
  )
}