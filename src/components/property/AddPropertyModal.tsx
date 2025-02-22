import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useProperties } from '../../contexts/PropertyContext'
import { supabase } from '../../lib/supabaseClient'
import PropertyMap from '../property/PropertyMap'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPropertyModal({ isOpen, onClose }: AddPropertyModalProps) {
  const [cities, setCities] = useState<{ id: number; name: string; coordinates?: { lng: number; lat: number } }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('cities')
          .select('id, name, coordinates')
          .order('name')

        if (error) throw error
        if (data) setCities(data)
      } catch (error) {
        console.error('Error fetching cities:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchCities()
    }
  }, [isOpen])

  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lng: number; lat: number } | null>(null)

  const [formData, setFormData] = useState({
    location: '',
    title: '',
    description: '',
    type: 'sale',
    property_type: 'apartment',
    price: '',
    area: '',
    rooms: '',
    city_id: '',
    images: [] as string[],
    features: [] as string[],
  })

  const { addProperty } = useProperties()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!selectedCoordinates) {
        alert('Пожалуйста, укажите расположение объекта на карте')
        return
      }

      // Валидация перед отправкой
      if (!validateNumber(formData.rooms, 1, 20)) {
        alert('Количество комнат должно быть от 1 до 20')
        return
      }
      if (!validateNumber(formData.area, 1, 1000)) {
        alert('Площадь должна быть от 1 до 1000 м²')
        return
      }
      if (!validateNumber(formData.price, 1, 100000000)) {
        alert('Цена должна быть от 1 до 100,000,000')
        return
      }

      const property = {
        ...formData,
        price: Number(formData.price),
        area: Number(formData.area),
        rooms: Number(formData.rooms),
        images: formData.images,
        features: formData.features,
        coordinates: selectedCoordinates
      }

      await addProperty(property)
      onClose()
      
      // Очищаем форму
      setFormData({
        title: '',
        description: '',
        type: 'sale',
        property_type: 'apartment',
        price: '',
        area: '',
        rooms: '',
        city_id: '',
        location: '',
        images: [],
        coordinates: null
      })
    } catch (error) {
      console.error('Error adding property:', error)
      // TODO: Показать уведомление об ошибке
    }

  }

  const validateNumber = (value: string, min: number, max: number) => {
    const num = Number(value)
    return !isNaN(num) && num >= min && num <= max
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Валидация числовых полей
    if (name === 'rooms' && !validateNumber(value, 1, 20)) {
      return // Не обновляем значение, если оно невалидно
    }
    if (name === 'area' && !validateNumber(value, 1, 1000)) {
      return
    }
    if (name === 'price' && !validateNumber(value, 1, 100000000)) {
      return
    }

    if (name === 'city_id') {
      const city = cities.find(c => c.id.toString() === value)
      if (city?.coordinates) {
        setSelectedCoordinates(city.coordinates)
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const files = Array.from(e.target.files)
        const uploadPromises = files.map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `property-images/${fileName}`

          // Проверяем размер файла
          if (file.size > 5 * 1024 * 1024) { // 5MB
            throw new Error('Размер файла не должен превышать 5MB')
          }

          // Проверяем тип файла
          if (!file.type.startsWith('image/')) {
            throw new Error('Разрешены только изображения')
          }

          const { error: uploadError, data } = await supabase.storage
            .from('properties')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('properties')
            .getPublicUrl(filePath)

          return publicUrl
        })

        const urls = await Promise.all(uploadPromises)
        setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }))
      } catch (error) {
        console.error('Error uploading files:', error)
        alert('Ошибка при загрузке изображений')
      }
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto mt-16">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-xl shadow-lg max-h-[91vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Добавить объявление
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Тип сделки */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Тип сделки
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="sale">Продажа</option>
                  <option value="rent">Аренда</option>
                </select>
              </div>

              {/* Тип недвижимости */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Тип недвижимости
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="apartment">Квартира</option>
                  <option value="house">Дом</option>
                  <option value="commercial">Коммерческая недвижимость</option>
                  <option value="land">Земельный участок</option>
                </select>
              </div>

              {/* Заголовок */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Заголовок объявления
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Адрес */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Адрес
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                  placeholder="Например: ул. Пушкина, д. 10"
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Цена */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Цена (€)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Площадь */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Площадь (м²)
                </label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Количество комнат */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Количество комнат
                </label>
                <input
                  type="number"
                  name="rooms"
                  value={formData.rooms}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Город */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Город
                </label>
                <select
                  name="city_id"
                  value={formData.city_id}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                >
                  <option value="">Выберите город</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>

              {/* Карта */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Расположение на карте
                </label>
                <div className="h-[400px] rounded-lg overflow-hidden border border-gray-300">
                  <PropertyMap
                    center={selectedCoordinates ? [selectedCoordinates.lng, selectedCoordinates.lat] : undefined}
                    zoom={14}
                    properties={selectedCoordinates ? [{ coordinates: selectedCoordinates, title: 'Выбранное местоположение' } as Property] : []}
                    onMarkerPlace={setSelectedCoordinates}
                    allowMarkerPlacement={true}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Выберите город, чтобы указать расположение объекта на карте
                </p>
              </div>

              {/* Фотографии */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Фотографии
                </label>
                <input
                  type="file"
                  name="images"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Опубликовать
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
