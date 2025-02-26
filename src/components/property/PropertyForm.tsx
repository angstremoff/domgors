import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

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

export default function PropertyForm() {
  const navigate = useNavigate()
  const { user } = useAuth()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      // Upload images
      const imageUrls = await Promise.all(
        formData.images.map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `properties/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('properties')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/properties/${fileName}`
        })
      )

      // Create property listing
      const { error } = await supabase.from('properties').insert({
        ...formData,
        images: imageUrls,
        user_id: user.id
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

      {/* Other form fields */}
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

        {/* Add other necessary fields */}
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