import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useProperties } from '../../contexts/PropertyContext'
import { supabase } from '../../lib/supabaseClient'
import PropertyMap from '../property/PropertyMap'
import { useTranslation } from 'react-i18next'
import { propertyService } from '../../services/propertyService'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPropertyModal({ isOpen, onClose }: AddPropertyModalProps) {
  const { t } = useTranslation()
  const [cities, setCities] = useState<{ id: number; name: string; coordinates?: { lng: number; lat: number } }[]>([])
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id, name, coordinates')
          .order('name')

        if (error) throw error
        if (data) setCities(data)
      } catch (error) {
        console.error('Error fetching cities:', error)
      }
    }

    if (isOpen) {
      fetchCities()
    }
  }, [isOpen])

  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lng: number; lat: number } | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'sale' as 'sale' | 'rent',
    property_type: 'apartment',
    price: '',
    area: '',
    rooms: '',
    city_id: 0,
    location: '',
    images: [] as string[],
    features: [] as string[],
  })

  const { addProperty } = useProperties()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Проверка авторизации
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Необходимо авторизоваться')
        return
      }
      
      // Проверка лимита объявлений (максимум 20)
      const userPropertiesCount = await propertyService.getUserPropertiesCount(user.id)
      if (userPropertiesCount >= 20) {
        alert(t('addProperty.validation.maxPropertiesError'))
        return
      }

      if (!selectedCoordinates) {
        alert(t('addProperty.validation.selectLocation'))
        return
      }

      if (!formData.location || formData.location.trim() === '') {
        alert(t('addProperty.validation.enterAddress'))
        return
      }

      if (!formData.city_id) {
        alert(t('addProperty.validation.selectCity'))
        return
      }

      // Валидация перед отправкой
      if (!validateNumber(formData.rooms, 1, 20)) {
        alert(t('addProperty.validation.roomsRange'))
        return
      }
      if (!validateNumber(formData.area, 1, 1000)) {
        alert(t('addProperty.validation.areaRange'))
        return
      }
      if (!validateNumber(formData.price, 1, 100000000)) {
        alert(t('addProperty.validation.priceRange'))
        return
      }

      const selectedCity = cities.find(city => city.id === Number(formData.city_id))
      if (!selectedCity) {
        alert(t('addProperty.validation.cityNotFound'))
        return
      }

      const property = {
        ...formData,
        price: Number(formData.price),
        area: Number(formData.area),
        rooms: Number(formData.rooms),
        city_id: Number(formData.city_id),
        images: formData.images,
        features: formData.features,
        coordinates: selectedCoordinates,
        location: formData.location.trim(),
        status: 'active' as 'active' | 'sold',
        user_id: null // Add the required user_id property
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
        city_id: 0,
        location: '',
        images: [],
        features: []
      })
      setSelectedCoordinates(null) // Сбрасываем выбранные координаты
    } catch (error) {
      console.error('Error adding property:', error)
      alert(t('addProperty.validation.addError'))
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
        setFormData(prev => ({ ...prev, [name]: Number(value) }))
        setSelectedCoordinates(city.coordinates)
      } else {
        setFormData(prev => ({ ...prev, [name]: Number(value) }))
        setSelectedCoordinates(null)
      }
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const files = Array.from(e.target.files)
        if (files.length + formData.images.length > 10) {
          alert(t('addProperty.validation.maxPhotos'))
          return
        }

        const uploadPromises = files.map(async (file) => {
          // Проверяем размер файла
          if (file.size > 5 * 1024 * 1024) { // 5MB
            throw new Error(t('addProperty.validation.maxFileSize'))
          }

          // Проверяем тип файла
          if (!file.type.startsWith('image/')) {
            throw new Error(t('addProperty.validation.onlyImages'))
          }

          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `property-images/${fileName}`

          const { error: uploadError } = await supabase.storage
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
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...urls].slice(0, 10)
        }))
      } catch (error) {
        console.error('Error uploading files:', error)
        alert(t('addProperty.validation.uploadError'))
      }
    }
  }



  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto mt-16">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-xl shadow-lg max-h-[91vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
              {t('addProperty.title')}
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
                  {t('filters.propertyType')}
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="sale">{t('transactionTypes.sale')}</option>
                  <option value="rent">{t('transactionTypes.rent')}</option>
                </select>
              </div>

              {/* Тип недвижимости */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('filters.propertyType')}
                </label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="apartment">{t('propertyTypes.apartment')}</option>
                  <option value="house">{t('propertyTypes.house')}</option>
                  <option value="commercial">{t('propertyTypes.commercial')}</option>
                  {formData.type === 'sale' && <option value="land">{t('propertyTypes.land')}</option>}
                </select>
              </div>

              {/* Заголовок */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('addProperty.form.title')}
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
                  {t('addProperty.form.address')}
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                  placeholder={t('addProperty.form.addressPlaceholder')}
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('addProperty.form.description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                  placeholder={t('addProperty.form.descriptionPlaceholder')}
                />
              </div>

              {/* Цена */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {formData.type === 'rent' ? t('filters.pricePerMonth') : t('filters.price')} (€)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                  placeholder={t('addProperty.form.pricePlaceholder')}
                />
              </div>

              {/* Площадь */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('filters.area')} (м²)
                </label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                  placeholder={t('addProperty.form.areaPlaceholder')}
                />
              </div>

              {/* Количество комнат */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('filters.rooms')}
                </label>
                <input
                  type="number"
                  name="rooms"
                  value={formData.rooms}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                  placeholder={t('addProperty.form.roomsPlaceholder')}
                />
              </div>

              {/* Город */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.selectCity')}
                </label>
                <select
                  name="city_id"
                  value={formData.city_id}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                >
                  <option value="">{t('common.selectCity')}</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>

              {/* Карта */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('addProperty.form.mapLocation')}</label>
                <div className="h-[400px] rounded-lg overflow-hidden">
                  <PropertyMap
                    center={selectedCoordinates ? [selectedCoordinates.lng, selectedCoordinates.lat] : [20.457273, 44.787197]}
                    zoom={selectedCoordinates ? 14 : 11}
                    properties={selectedCoordinates ? [{
                      id: 'temp-marker',
                      title: t('addProperty.form.selectedLocation'),
                      description: t('addProperty.form.temporaryMarker'),
                      coordinates: selectedCoordinates,
                      type: 'sale',
                      property_type: formData.property_type,
                      price: 0,
                      area: 0,
                      rooms: 0,
                      city_id: 0,
                      images: [],
                      features: [],
                      status: 'active',
                      user_id: null,
                      created_at: new Date().toISOString(),
                      location: formData.location
                    }] : []}
                    onMarkerPlace={setSelectedCoordinates}
                    allowMarkerPlacement={true}
                  />
                </div>
                {formData.location && (
                  <div className="mt-2 text-sm text-gray-500">
                    {t('addProperty.form.selectedAddress')}: {formData.location}
                  </div>
                )}
              </div>

              {/* Фотографии */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('addProperty.form.photos')} ({t('addProperty.form.maxPhotos')})
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
                  disabled={formData.images.length >= 10}
                  title={t('addProperty.form.noFileSelected')}
                  data-browse={t('addProperty.form.selectFiles')}
                />
                {formData.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative w-24 h-24">
                        <img
                          src={url}
                          alt={`${t('addProperty.form.preview')} ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {t('common.publish')}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
