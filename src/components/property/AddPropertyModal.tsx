import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useProperties } from '../../contexts/PropertyContext'
import { supabase } from '../../lib/supabaseClient'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPropertyModal({ isOpen, onClose }: AddPropertyModalProps) {
  const [cities, setCities] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('cities')
          .select('id, name')
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

  const [formData, setFormData] = useState({
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
      const property = {
        ...formData,
        price: Number(formData.price),
        area: Number(formData.area),
        rooms: Number(formData.rooms),
        images: formData.images,
        features: formData.features
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
        images: []
      })
    } catch (error) {
      console.error('Error adding property:', error)
      // TODO: Показать уведомление об ошибке
    }

  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // TODO: Implement file upload to storage and get URLs
      const urls = ['https://example.com/placeholder.jpg'] // Placeholder
      setFormData(prev => ({ ...prev, images: urls }))
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
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
