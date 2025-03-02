import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { Tab } from '@headlessui/react'
import { Property } from '../../contexts/PropertyContext'
import EditPropertyModal from '../property/EditPropertyModal'
import { useTranslation } from 'react-i18next'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [userProperties, setUserProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)

  // Загрузка данных пользователя и его объявлений
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return

      try {
        // Загрузка профиля пользователя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', user.id)
          .single()

        if (userError) throw userError

        if (userData) {
          setName(userData.name || '')
          setPhone(userData.phone || '')
        }

        // Загрузка объявлений пользователя
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (propertiesError) throw propertiesError

        setUserProperties(properties)
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name,
          phone,
          email: user.email
        })

      if (error) throw error

      // Show success message or handle success case
      console.log('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePropertyStatusUpdate = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'sold' })
        .eq('id', propertyId)
        .eq('user_id', user?.id)

      if (error) throw error

      // Обновляем локальное состояние
      setUserProperties(prev =>
        prev.map(prop =>
          prop.id === propertyId ? { ...prop, status: 'sold' } : prop
        )
      )
    } catch (error) {
      console.error('Error updating property status:', error)
    }
  }
  
  const handleEditProperty = (propertyId: string) => {
    setEditingPropertyId(propertyId)
  }
  
  const handleEditClose = () => {
    setEditingPropertyId(null)
    // Обновляем список объявлений после редактирования
    if (user) {
      setIsLoading(true)
      supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error reloading properties:', error)
          } else if (data) {
            setUserProperties(data)
          }
          setIsLoading(false)
        })
    }
  }

  if (!user) return null

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('common.profile')}</h1>

        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-900'
                )
              }
            >
              {t('common.personalInfo')}
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-900'
                )
              }
            >
              {t('common.myListings')}
            </Tab>
          </Tab.List>

          <Tab.Panels>
            <Tab.Panel>
              <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    {t('profile.name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-secondary-600 focus:outline-none focus:ring-1 focus:ring-secondary-600
                             sm:text-sm bg-white/50"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    {t('profile.phone')}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2
                             focus:border-secondary-600 focus:outline-none focus:ring-1 focus:ring-secondary-600
                             sm:text-sm bg-white/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex justify-center rounded-md border border-transparent
                           bg-gray-900 py-2 px-4 text-sm font-medium text-white shadow-sm
                           hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500
                           focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t('common.saving') : t('common.save')}
                </button>
              </form>
            </Tab.Panel>

            <Tab.Panel>
              {isLoading ? (
                <div>{t('common.loading')}</div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {userProperties.map((property) => (
                    <div
                      key={property.id}
                      className="relative overflow-hidden rounded-lg border border-gray-200"
                    >
                      <div className="relative aspect-[4/3]">
                        <img
                          src={property.images[0] || '/placeholder.jpg'}
                          alt={property.title}
                          className={classNames(
                            'h-full w-full object-cover',
                            property.status === 'sold' ? 'grayscale' : ''
                          )}
                        />
                        {property.status === 'sold' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                            <span className="text-white text-xl font-bold">
                              {property.type === 'sale' ? 'ПРОДАНО' : 'СДАНО'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="text-lg font-semibold">{property.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {property.price.toLocaleString()} ₽
                        </p>
                        {property.status !== 'sold' && (
                          <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleEditProperty(property.id)}
                              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2
                                       text-sm font-medium text-white hover:bg-indigo-700"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handlePropertyStatusUpdate(property.id)}
                              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2
                                       text-sm font-medium text-white hover:bg-gray-800"
                            >
                              {property.type === 'sale' ? t('common.markAsSold') : t('common.markAsRented')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {editingPropertyId && (
        <EditPropertyModal
          propertyId={editingPropertyId}
          isOpen={!!editingPropertyId}
          onClose={handleEditClose}
        />
      )}
    </>
  )
}