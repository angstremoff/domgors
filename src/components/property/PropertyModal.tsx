import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import FavoriteButton from './FavoriteButton'
import PlaceholderImage from './PlaceholderImage'
import PropertyMap from './PropertyMap'

interface Property {
  id: string
  title: string
  location: string
  price: number
  type: 'sale' | 'rent'
  property_type: string
  area: number
  rooms: number
  description: string
  images: string[]
  status?: 'sold'
  coordinates: {
    lat: number
    lng: number
  } | null
  user?: {
    name: string | null
    phone: string | null
  }
}

interface PropertyModalProps {
  property: Property | null
  open: boolean
  onClose: () => void
}

export default function PropertyModal({ property, open, onClose }: PropertyModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!property) return null

  const nextImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length)
    }
  }

  const previousImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-2xl bg-white p-6 text-left shadow-xl transition-all w-full max-w-4xl max-h-[91vh] overflow-y-auto">
                <div className="absolute right-4 top-4 z-10 flex space-x-2">
                  <FavoriteButton propertyId={property.id} />
                  <button
                    type="button"
                    className="p-2 rounded-full bg-white/90 backdrop-blur-md hover:bg-gray-100 transition-colors duration-200"
                    onClick={onClose}
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div>
                  {/* Images Gallery */}
                  <div className="mb-8">
                    <div className="aspect-[16/9] overflow-hidden rounded-xl relative group">
                      {property.images && property.images.length > 0 ? (
                        <>
                          <img
                            src={property.images[currentImageIndex]}
                            alt={`${property.title} - изображение ${currentImageIndex + 1}`}
                            className={`w-full h-full object-cover ${property.status === 'sold' ? 'grayscale' : ''}`}
                          />
                          {property.images.length > 1 && (
                            <>
                              <button
                                onClick={previousImage}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors duration-200 opacity-0 group-hover:opacity-100"
                              >
                                <ChevronLeftIcon className="w-6 h-6 text-gray-800" />
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors duration-200 opacity-0 group-hover:opacity-100"
                              >
                                <ChevronRightIcon className="w-6 h-6 text-gray-800" />
                              </button>
                              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                {property.images.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`w-2 h-2 rounded-full transition-colors duration-200 ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <PlaceholderImage />
                      )}
                      {property.status === 'sold' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                          <span className="text-white text-2xl font-bold">ПРОДАНО</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Dialog.Title as="h3" className="text-2xl font-semibold text-gray-900 mb-2">
                    {property.title}
                  </Dialog.Title>

                  {/* Основная информация */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Основные характеристики</h4>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <span className="font-medium">Тип: </span>
                          {property.type === 'sale' ? 'Продажа' : 'Аренда'}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Тип недвижимости: </span>
                          {{
                            'apartment': 'Квартира',
                            'house': 'Дом',
                            'commercial': 'Коммерческая недвижимость',
                            'land': 'Земельный участок'
                          }[property.property_type] || property.property_type}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Цена: </span>
                          {property.price.toLocaleString()} €
                          {property.type === 'rent' && '/мес'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Характеристики</h4>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <span className="font-medium">Площадь: </span>
                          {property.area} м²
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Комнат: </span>
                          {property.rooms}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Адрес: </span>
                          {property.city?.name}, {property.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Описание */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Описание</h4>
                    <p className="text-gray-600 whitespace-pre-line">{property.description}</p>
                  </div>

                  {/* Контактная информация продавца */}
                  {property.user && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Контактная информация</h4>
                      <div className="space-y-2">
                        <p className="text-gray-600">
                          <span className="font-medium">Имя: </span>
                          {property.user.name || 'Не указано'}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Телефон: </span>
                          {property.user.phone || 'Не указан'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Map Section */}
                  {property.coordinates && (
                    <div className="mt-8">
                      <h4 className="font-medium text-gray-900 mb-4">Расположение на карте</h4>
                      <div className="h-[300px] rounded-xl overflow-hidden">
                        <PropertyMap properties={[property]} />
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
