import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
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
  coordinates: {
    lat: number
    lng: number
  } | null
}

interface PropertyModalProps {
  property: Property | null
  open: boolean
  onClose: () => void
}

export default function PropertyModal({ property, open, onClose }: PropertyModalProps) {
  if (!property) return null

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
              <Dialog.Panel className="relative transform rounded-2xl bg-white p-6 text-left shadow-xl transition-all w-full max-w-4xl max-h-[70vh] overflow-y-auto">
                <div className="absolute right-4 top-4 z-10 flex space-x-2">
                  <FavoriteButton propertyId={property.id} />
                  <button
                    type="button"
                    className="p-2 rounded-full bg-white/90 backdrop-blur-md hover:bg-white transition-colors duration-200"
                    onClick={onClose}
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Image Gallery */}
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-6">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0">
                      <PlaceholderImage />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div>
                  <Dialog.Title as="h3" className="text-2xl font-semibold text-gray-900 mb-2">
                    {property.title}
                  </Dialog.Title>
                  
                  <div className="flex items-center gap-4 text-lg mb-6">
                    <p className="font-semibold text-gray-900">
                      {property.price.toLocaleString()} €
                      {property.type === 'rent' && <span className="text-sm font-normal opacity-90">/мес</span>}
                    </p>
                    <div className={[
                      'px-3 py-1 rounded-full text-sm font-medium',
                      property.type === 'sale' 
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-emerald-100 text-emerald-800'
                    ].join(' ')}>
                      {property.type === 'sale' ? 'Продажа' : 'Аренда'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Характеристики</h4>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-gray-500">Тип</dt>
                          <dd className="text-gray-900">{property.property_type}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">Площадь</dt>
                          <dd className="text-gray-900">{property.area} м²</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">Комнат</dt>
                          <dd className="text-gray-900">{property.rooms}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-gray-500">Расположение</dt>
                          <dd className="text-gray-900">{property.location}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Описание</h4>
                      <p className="text-gray-600 whitespace-pre-line">
                        {property.description}
                      </p>
                    </div>
                  </div>

                  {/* Map */}
                  {property.coordinates && (
                    <div className="mt-6 rounded-xl overflow-hidden">
                      <div className="h-[300px]">
                        <PropertyMap
                          properties={[property]}
                          center={property.coordinates}
                          zoom={14}
                        />
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
