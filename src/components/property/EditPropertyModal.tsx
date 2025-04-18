import { Dialog } from '@headlessui/react'
import { useState, useEffect } from 'react'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { supabase, validateSession } from '../../lib/supabaseClient'
import { useTranslation } from 'react-i18next'
import { compressImage } from '../../utils/imageCompression'

interface EditPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
}

export default function EditPropertyModal({ isOpen, onClose, propertyId }: EditPropertyModalProps) {
  const { t } = useTranslation()
  const [cities, setCities] = useState<{ id: number; name: string; coordinates?: { lng: number; lat: number } }[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lng: number; lat: number } | null>(null)
  const [existingImages, setExistingImages] = useState<string[]>([])

  const [formData, setFormData] = useState({
    location: '',
    title: '',
    description: '',
    type: 'sale' as 'sale' | 'rent',
    property_type: 'apartment',
    price: '',
    area: '',
    rooms: '',
    city_id: 0,
    images: [] as string[],
    features: [] as string[],
  })

  // Загрузка данных объявления и городов
  useEffect(() => {
    if (isOpen && propertyId) {
      const fetchData = async () => {
        try {
          setLoading(true)
          
          // Загружаем данные объявления
          const { data: property, error: propertyError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single()
          
          if (propertyError) throw propertyError
          
          if (property) {
            setFormData({
              title: property.title || '',
              description: property.description || '',
              type: property.type || 'sale',
              property_type: property.property_type || 'apartment',
              price: property.price?.toString() || '',
              area: property.area?.toString() || '',
              rooms: property.rooms?.toString() || '',
              city_id: property.city_id || 0,
              location: property.location || '',
              images: [],
              features: property.features || [],
            })
            
            // Устанавливаем существующие изображения
            if (property.images && Array.isArray(property.images)) {
              setExistingImages(property.images)
            }
            
            // Устанавливаем координаты
            if (property.coordinates) {
              setSelectedCoordinates(property.coordinates)
            }
          }
          
          // Загружаем список городов
          const { data: citiesData, error: citiesError } = await supabase
            .from('cities')
            .select('id, name, coordinates')
            .order('name')

          if (citiesError) throw citiesError
          if (citiesData) setCities(citiesData)
          
        } catch (error) {
          console.error('Error loading property data:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchData()
    }
  }, [isOpen, propertyId])

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
      }
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        // Проверяем сессию перед загрузкой файлов
        await validateSession()
        
        setIsUploading(true) // Устанавливаем флаг загрузки
        const files = Array.from(e.target.files)
        if (files.length + existingImages.length + formData.images.length > 15) {
          alert(t('addProperty.form.maxPhotos'))
          setIsUploading(false) // Сбрасываем флаг при превышении лимита
          return
        }

        const uploadPromises = files.map(async (file) => {
          // Проверяем размер файла
          if (file.size > 5 * 1024 * 1024) { // 5MB
            throw new Error(t('addProperty.form.fileSizeError'))
          }

          // Проверяем тип файла
          if (!file.type.startsWith('image/')) {
            throw new Error(t('addProperty.form.fileTypeError'))
          }

          // Сжимаем изображение перед загрузкой
          const compressedFile = await compressImage(file, 0.3) // Сжимаем до 300 КБ
          
          const fileExt = compressedFile.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `property-images/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('properties')
            .upload(filePath, compressedFile, {
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
          images: [...prev.images, ...urls]
        }))
        setIsUploading(false) // Сбрасываем флаг загрузки после успешной загрузки
      } catch (error) {
        console.error('Error uploading files:', error)
        alert(t('addProperty.form.uploadError'))
        setIsUploading(false) // Сбрасываем флаг загрузки при ошибке
      }
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Проверяем и обновляем токен перед отправкой формы
    await validateSession()
    
    try {
      setIsSaving(true)
      
      if (!selectedCoordinates) {
        alert(t('addProperty.validation.selectLocation'))
        setIsSaving(false)
        return
      }

      if (!formData.city_id) {
        alert(t('addProperty.validation.selectCity'))
        setIsSaving(false)
        return
      }

      // Валидация перед отправкой
      if (!validateNumber(formData.rooms, 1, 20)) {
        alert(t('addProperty.validation.roomsRange'))
        setIsSaving(false)
        return
      }
      if (!validateNumber(formData.area, 1, 1000)) {
        alert(t('addProperty.validation.areaRange'))
        setIsSaving(false)
        return
      }
      if (!validateNumber(formData.price, 1, 100000000)) {
        alert(t('addProperty.validation.priceRange'))
        setIsSaving(false)
        return
      }

      // Объединяем существующие и новые изображения
      const allImages = [...existingImages, ...formData.images]
      
      // Создаем объект с обновленными данными
      const updatedProperty = {
        ...formData,
        price: Number(formData.price),
        area: Number(formData.area),
        rooms: Number(formData.rooms),
        city_id: Number(formData.city_id),
        images: allImages,
        coordinates: selectedCoordinates
      }

      // Отправляем обновленные данные в Supabase
      const { error } = await supabase
        .from('properties')
        .update(updatedProperty)
        .eq('id', propertyId)

      if (error) throw error
      
      // Закрываем модальное окно
      onClose()
    } catch (error) {
      console.error('Error updating property:', error)
      alert(t('addProperty.form.updateError'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => {
      const features = [...prev.features]
      if (features.includes(feature)) {
        return { ...prev, features: features.filter(f => f !== feature) }
      } else {
        return { ...prev, features: [...features, feature] }
      }
    })
  }



  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto mt-16">
        <Dialog.Panel className="w-full max-w-2xl bg-white rounded-xl shadow-lg max-h-[91vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {t('addProperty.editTitle')}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 flex justify-center">
              <p>{t('common.loading')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Тип сделки */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('addProperty.form.transactionType')}
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                  >
                    <option value="sale">{t('addProperty.form.sale')}</option>
                    <option value="rent">{t('addProperty.form.rent')}</option>
                  </select>
                </div>

                {/* Тип недвижимости */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('addProperty.form.propertyType')}
                  </label>
                  <select
                    name="property_type"
                    value={formData.property_type}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                  >
                    <option value="apartment">{t('addProperty.form.apartment')}</option>
                    <option value="house">{t('addProperty.form.house')}</option>
                    <option value="commercial">{t('addProperty.form.commercial')}</option>
                    <option value="land">{t('addProperty.form.land')}</option>
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
                  />
                </div>

                {/* Город */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('addProperty.form.city')}
                  </label>
                  <select
                    name="city_id"
                    value={formData.city_id}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                  >
                    <option value="0">{t('addProperty.form.cityPlaceholder')}</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>

                {/* Цена */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('addProperty.form.price')} {formData.type === 'rent' ? t('addProperty.form.pricePerMonth') : ''}
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                    min="1"
                    max="100000000"
                  />
                </div>

                {/* Площадь */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('addProperty.form.area')}
                  </label>
                  <input
                    type="number"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                    min="1"
                    max="1000"
                  />
                </div>

                {/* Количество комнат */}
                {formData.property_type !== 'land' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('addProperty.form.rooms')}
                    </label>
                    <input
                      type="number"
                      name="rooms"
                      value={formData.rooms}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      required
                      min="1"
                      max="20"
                    />
                  </div>
                )}

                {/* Особенности */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('addProperty.form.features')}
                  </label>
                  <div className="space-y-2">
                    {['parking', 'balcony', 'elevator', 'furnished'].map(feature => (
                      <label key={feature} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.features.includes(feature)}
                          onChange={() => handleFeatureToggle(feature)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {{
                            parking: t('addProperty.form.parking'),
                            balcony: t('addProperty.form.balcony'),
                            elevator: t('addProperty.form.elevator'),
                            furnished: t('addProperty.form.furnished')
                          }[feature]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Фотографии */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('addProperty.form.photos')}
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    accept="image/*"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-violet-50 file:text-violet-700
                      hover:file:bg-violet-100"
                    disabled={existingImages.length + formData.images.length >= 15 || isUploading}
                  />
                  <p className="mt-1 text-sm text-gray-500">{t('addProperty.form.photosHint')}</p>

                  {/* Предпросмотр существующих фотографий */}
                  {existingImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {existingImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={t('addProperty.form.existingPhoto', { index: index + 1 })}
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          {/* Кнопка удаления фото */}
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          
                          {/* Кнопки перемещения фотографии */}
                          <div className="absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Кнопка вверх/влево */}
                            <button
                              type="button"
                              onClick={() => {
                                if (index === 0) return; // Не перемещаем, если это первый элемент
                                // Создаем копию массива
                                const newImages = [...existingImages];
                                // Меняем местами текущий и предыдущий элементы
                                const temp = newImages[index];
                                newImages[index] = newImages[index - 1];
                                newImages[index - 1] = temp;
                                // Обновляем массив фотографий
                                setExistingImages(newImages);
                              }}
                              disabled={index === 0}
                              className={`bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                              aria-label="Переместить выше"
                            >
                              ↑
                            </button>
                            
                            {/* Кнопка вниз/вправо */}
                            <button
                              type="button"
                              onClick={() => {
                                if (index === existingImages.length - 1) return; // Не перемещаем, если это последний элемент
                                // Создаем копию массива
                                const newImages = [...existingImages];
                                // Меняем местами текущий и следующий элементы
                                const temp = newImages[index];
                                newImages[index] = newImages[index + 1];
                                newImages[index + 1] = temp;
                                // Обновляем массив фотографий
                                setExistingImages(newImages);
                              }}
                              disabled={index === existingImages.length - 1}
                              className={`bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md ${index === existingImages.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                              aria-label="Переместить ниже"
                            >
                              ↓
                            </button>
                          </div>
                          
                          {/* Номер фотографии */}
                          <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white px-1 text-xs rounded-br rounded-tl">
                            {existingImages.length + index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Предпросмотр новых фотографий */}
                  {formData.images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={t('addProperty.form.newPhoto', { index: existingImages.length + index + 1 })}
                            className="h-24 w-full object-cover rounded-lg"
                          />
                          {/* Кнопка удаления фото */}
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          
                          {/* Кнопки перемещения фотографии */}
                          <div className="absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Кнопка вверх/влево */}
                            <button
                              type="button"
                              onClick={() => {
                                if (index === 0) return; // Не перемещаем, если это первый элемент
                                // Создаем копию массива
                                const newImages = [...formData.images];
                                // Меняем местами текущий и предыдущий элементы
                                const temp = newImages[index];
                                newImages[index] = newImages[index - 1];
                                newImages[index - 1] = temp;
                                // Обновляем массив фотографий
                                setFormData(prev => ({ ...prev, images: newImages }));
                              }}
                              disabled={index === 0}
                              className={`bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                              aria-label="Переместить выше"
                            >
                              ↑
                            </button>
                            
                            {/* Кнопка вниз/вправо */}
                            <button
                              type="button"
                              onClick={() => {
                                if (index === formData.images.length - 1) return; // Не перемещаем, если это последний элемент
                                // Создаем копию массива
                                const newImages = [...formData.images];
                                // Меняем местами текущий и следующий элементы
                                const temp = newImages[index];
                                newImages[index] = newImages[index + 1];
                                newImages[index + 1] = temp;
                                // Обновляем массив фотографий
                                setFormData(prev => ({ ...prev, images: newImages }));
                              }}
                              disabled={index === formData.images.length - 1}
                              className={`bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md ${index === formData.images.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                              aria-label="Переместить ниже"
                            >
                              ↓
                            </button>
                          </div>
                          
                          {/* Номер фотографии */}
                          <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white px-1 text-xs rounded-br rounded-tl">
                            {existingImages.length + index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>



                {/* Кнопки */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}