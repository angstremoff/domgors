import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropertyMap from './PropertyMap'
import PlaceholderImage from './PlaceholderImage'
import FavoriteButton from './FavoriteButton'
import { PropertyModalProps, ContextProperty } from './types'

export default function PropertyModal({ property, open, onClose }: PropertyModalProps) {
  const { t } = useTranslation()
  const [isPhoneVisible, setIsPhoneVisible] = useState(false)

  // Преобразуем свойство в формат, ожидаемый компонентом PropertyMap
  const mapProperty: ContextProperty = {
    ...property,
    coordinates: property.coordinates ? {
      lat: Number((property.coordinates as any).lat),
      lng: Number((property.coordinates as any).lng)
    } : null,
    user: property.user ? {
      name: property.user.name,
      phone: property.user.phone
    } : undefined,
    city: property.city || undefined
  }

  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Функции для навигации по изображениям
  const nextImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length)
    }
  }

  const prevImage = () => {
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto mt-16">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-[85%] bg-white rounded-xl shadow-lg max-h-[91vh] overflow-y-auto relative">
              <div className="sticky top-0 right-0 z-30 flex items-center gap-2 p-3 justify-end bg-gradient-to-b from-black/50 to-transparent">
                <FavoriteButton propertyId={property.id} />
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/80 text-gray-800 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                {/* Two column layout */}
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left column: Images and Map */}
                  <div className="lg:w-1/2">
                    {/* Property Images */}
                    <div className="mb-6 relative rounded-xl overflow-hidden">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {property.status === 'sold' && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="bg-black/80 text-white px-4 py-1.5 rounded-full text-base font-semibold backdrop-blur-sm">
                              {property.type === 'sale' ? t('status.sold') : t('status.rented')}
                            </div>
                          </div>
                        )}
                        {property.images && property.images.length > 0 ? (
                          <>
                            <img
                              src={property.images[currentImageIndex]}
                              alt={property.title}
                              className={[
                                'absolute inset-0 w-full h-full object-cover',
                                property.status === 'sold' ? 'grayscale' : ''
                              ].join(' ')}
                            />
                            {property.images.length > 1 && (
                              <>
                                <button
                                  onClick={prevImage}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-gray-800 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={nextImage}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-gray-800 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <PlaceholderImage />
                        )}
                      </div>
                      <div className="absolute top-3 left-3 z-10 flex gap-2">
                        <div className={[
                          'px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-md text-white',
                          property.type === 'sale' ? 'bg-emerald-500/90' : 'bg-blue-500/90'
                        ].join(' ')}>
                          {property.type === 'sale' ? t('transactionTypes.sale') : t('transactionTypes.rent')}
                        </div>
                        <div className={[
                          'px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-md text-white',
                          property.property_type === 'apartment' && 'bg-violet-600/90',
                          property.property_type === 'house' && 'bg-orange-500/90',
                          property.property_type === 'commercial' && 'bg-cyan-600/90',
                          property.property_type === 'land' && 'bg-lime-600/90'
                        ].filter(Boolean).join(' ')}>
                          {property.property_type === 'apartment' && t('propertyTypes.apartment')}
                          {property.property_type === 'house' && t('propertyTypes.house')}
                          {property.property_type === 'commercial' && t('propertyTypes.commercial')}
                          {property.property_type === 'land' && t('propertyTypes.land')}
                        </div>
                      </div>
                    </div>

                    {/* Карта */}
                    {property.coordinates && (
                      <div className="mb-4">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {t('addProperty.form.mapLocation')}
                        </h4>
                        <div className="h-[300px] rounded-lg overflow-hidden">
                          <PropertyMap
                            center={[property.coordinates.lng, property.coordinates.lat]}
                            zoom={14}
                            properties={[mapProperty]}
                            onMarkerPlace={() => {}}
                            allowMarkerPlacement={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column: Property Info */}
                  <div className="lg:w-1/2">
                    {/* Property Title and Price */}
                    <div className="mb-6">
                      <div className="bg-[#1E3A8A] text-white p-4 rounded-t-xl">
                        <h2 className="text-xl font-bold">{property.title}</h2>
                        <p className="text-sm opacity-90 mt-1">{property.city?.name}, {property.location}</p>
                      </div>
                      <div className="bg-white p-4 rounded-b-xl border border-gray-100 shadow-sm">
                        <div className="text-xl font-bold text-[#1E3A8A]">
                          {property.price.toLocaleString()} €{property.type === 'rent' && t('common.perMonth')}
                        </div>
                      </div>
                    </div>

                    {/* Main Characteristics */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                      {property.property_type !== 'land' && (
                        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
                          <div className="flex flex-col items-center text-center">
                            <div className="p-2 bg-blue-50 rounded-full mb-2">
                              <svg className="w-6 h-6 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{t('filters.rooms')}</p>
                            <p className="text-base font-semibold text-gray-900">{property.rooms}</p>
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
                        <div className="flex flex-col items-center text-center">
                          <div className="p-2 bg-blue-50 rounded-full mb-2">
                            <svg className="w-6 h-6 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{t('filters.area')}</p>
                          <p className="text-base font-semibold text-gray-900">{property.area} {t('squareMeters')}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
                        <div className="flex flex-col items-center text-center">
                          <div className="p-2 bg-blue-50 rounded-full mb-2">
                            <svg className="w-6 h-6 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{t('addProperty.form.mapLocation')}</p>
                          <p className="text-base font-semibold text-gray-900">{property.city?.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Section: Description */}
                    <div className="mb-6">
                      <div className="bg-[#1E3A8A] text-white p-3 rounded-t-xl flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h4 className="text-lg font-bold">{t('addProperty.form.description')}</h4>
                      </div>
                      <div className="bg-white rounded-b-xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-sm text-gray-700 leading-relaxed">{property.description || t('common.noDescription')}</p>
                      </div>
                    </div>

                    {/* Section: Features */}
                    {property.features && property.features.length > 0 && (
                      <div className="mb-6">
                        <div className="bg-[#1E3A8A] text-white p-3 rounded-t-xl flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          <h4 className="text-lg font-bold">{t('filters.features')}</h4>
                        </div>
                        <div className="bg-white rounded-b-xl p-4 border border-gray-100 shadow-sm">
                          <div className="grid grid-cols-2 gap-3">
                            {property.features.includes('elevator') && (
                              <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full flex-shrink-0">
                                  <svg className="w-5 h-5 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-800">Лифт</span>
                              </div>
                            )}
                            {property.features.includes('parking') && (
                              <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full flex-shrink-0">
                                  <svg className="w-5 h-5 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1z M16 16h3a1 1 0 001-1V7a1 1 0 00-1-1h-3" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-800">Парковка</span>
                              </div>
                            )}
                            {property.features.includes('balcony') && (
                              <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full flex-shrink-0">
                                  <svg className="w-5 h-5 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M3 6h18M3 18h18" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-800">Балкон</span>
                              </div>
                            )}
                            {property.features.includes('furnished') && (
                              <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full flex-shrink-0">
                                  <svg className="w-5 h-5 text-[#1E3A8A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12V8h-4V4h-8v4H4v4m0 0v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 12h16" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-800">Мебель</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section: Contact Info */}
                    {property.user && (
                      <div className="mb-2">
                        <div className="bg-[#1E3A8A] text-white p-3 rounded-t-xl flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <h4 className="text-lg font-bold">{t('footer.contacts')}</h4>
                        </div>
                        <div className="bg-white rounded-b-xl p-4 border border-gray-100 shadow-sm">
                          <div className="space-y-3">
                            {property.user.name && (
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <p className="text-sm font-medium text-gray-800">{property.user.name}</p>
                              </div>
                            )}
                            {property.user.phone && (
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <button
                                  onClick={() => setIsPhoneVisible(!isPhoneVisible)}
                                  className="text-[#1E3A8A] font-medium hover:text-[#1E3A8A]/80 transition-colors"
                                >
                                  {isPhoneVisible ? property.user.phone : property.user.phone.replace(/\d(?=\d{4})/g, '*')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
