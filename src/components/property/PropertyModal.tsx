import { Dialog, Transition } from '@headlessui/react'
import { useState, Fragment, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PropertyMap from './PropertyMap'
import PlaceholderImage from './PlaceholderImage'
import FavoriteButton from './FavoriteButton'
import { PropertyModalProps, ContextProperty } from './types'

export default function PropertyModal({ property, open, onClose }: PropertyModalProps) {
  const { t } = useTranslation()
  const [isPhoneVisible, setIsPhoneVisible] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isCopied) {
      timer = setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    }
    return () => clearTimeout(timer)
  }, [isCopied])

  // Блокировка прокрутки и взаимодействия с основным окном при открытии фотографии на весь экран
  useEffect(() => {
    if (isFullScreenOpen) {
      // Блокируем прокрутку страницы
      document.body.style.overflow = 'hidden';
      // Добавляем класс для блокировки интерфейса
      document.body.classList.add('fullscreen-open');
    } else {
      // Возвращаем прокрутку и взаимодействие
      document.body.style.overflow = '';
      document.body.classList.remove('fullscreen-open');
    }
    
    // Удаляем стили при размонтировании компонента
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('fullscreen-open');
    };
  }, [isFullScreenOpen]);

  const handleCopyLink = () => {
    const propertyUrl = `${window.location.origin}?propertyId=${property.id}`
    navigator.clipboard.writeText(propertyUrl)
    setIsCopied(true)
  }

  const getShareUrl = (platform: string) => {
    const propertyUrl = `${window.location.origin}?propertyId=${property.id}`
    const title = encodeURIComponent(property.title)
    
    switch (platform) {
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(propertyUrl)}&text=${title}`
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(property.title + " " + propertyUrl)}`
      case 'viber':
        return `viber://forward?text=${encodeURIComponent(property.title + " " + propertyUrl)}`
      default:
        return '#'
    }
  }

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
    <>
      {/* Основное модальное окно */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={onClose}>
          <div className="min-h-screen px-4 flex items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
            </Transition.Child>

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-[95%] max-w-6xl bg-white rounded-xl shadow-xl overflow-y-auto relative max-h-[90vh]">
                <div className="sticky top-4 sm:top-3 right-0 z-30 flex items-center gap-1 sm:gap-2 p-2 sm:p-3 justify-end bg-gradient-to-b from-black/50 to-transparent">
                  <FavoriteButton propertyId={property.id} />
                  <button
                    onClick={onClose}
                    className="p-1.5 sm:p-2 rounded-full bg-white/80 text-gray-800 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-3 sm:p-4">
                  {/* Two column layout */}
                  <div className="flex flex-col lg:flex-row gap-3 sm:gap-6">
                    {/* Left column: Images */}
                    <div className="lg:w-1/2 flex flex-col">
                      {/* Property Images */}
                      <div className="mb-3 sm:mb-6 relative rounded-lg sm:rounded-xl overflow-hidden">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {property.status === 'sold' && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <div className="bg-black/80 text-white px-4 py-1.5 rounded-full text-base font-semibold backdrop-blur-sm">
                                {property.type === 'sale' ? t('status.sold') : t('status.rented')}
                              </div>
                            </div>
                          )}
                          {property.images && property.images.length > 0 ? (
                            <div className="image-container">
                              <img
                                src={property.images[currentImageIndex]}
                                alt={property.title}
                                className={[
                                  'absolute inset-0 w-full h-full object-cover cursor-pointer',
                                  property.status === 'sold' ? 'grayscale' : ''
                                ].join(' ')}
                                onClick={() => setIsFullScreenOpen(true)}
                              />
                              {property.images.length > 1 && (
                                <div className="image-navigation">
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
                                </div>
                              )}
                            </div>
                          ) : (
                            <PlaceholderImage />
                          )}
                        </div>
                        <div className="absolute top-3 left-3 z-10 flex gap-2">
                          <div className={[
                            'px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-md text-white',
                            property.type === 'sale' ? 'bg-emerald-500/90' : 'bg-blue-500/90'
                          ].join(' ')}>
                            {t(`transactionTypes.${property.type}`)}
                          </div>
                          <div className={[
                            'px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-md text-white',
                            property.property_type === 'apartment' && 'bg-violet-600/90',
                            property.property_type === 'house' && 'bg-orange-500/90',
                            property.property_type === 'commercial' && 'bg-cyan-600/90',
                            property.property_type === 'land' && 'bg-lime-600/90'
                          ].filter(Boolean).join(' ')}>
                            {t(`propertyTypes.${property.property_type}`)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Карта - видна только на десктопе */}
                      <div className="hidden lg:block">
                        {property.coordinates && (
                          <div className="mb-3 sm:mb-6">
                            <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <h4 className="text-base sm:text-lg font-bold">{t('addProperty.form.mapLocation')}</h4>
                            </div>
                            <div className="bg-white rounded-b-lg sm:rounded-b-xl p-0 border border-gray-100 shadow-sm">
                              <div className="h-[250px] rounded-b-lg sm:rounded-b-lg overflow-hidden">
                                <PropertyMap
                                  center={[property.coordinates.lng, property.coordinates.lat]}
                                  zoom={14}
                                  properties={[mapProperty]}
                                  onMarkerPlace={() => {}}
                                  allowMarkerPlacement={false}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column: Property Info */}
                    <div className="lg:w-1/2">
                      {/* Property Title and Price */}
                      <div className="mb-3 sm:mb-6">
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{property.title}</h2>
                        <p className="text-base sm:text-lg text-indigo-700 font-semibold flex items-baseline mt-1 sm:mt-2">
                          {property.price.toLocaleString()} €
                          {property.type === 'rent' && <span className="text-sm opacity-75 ml-1">/мес</span>}
                        </p>
                      </div>

                      {/* Property Quick Stats */}
                      <div className="flex flex-wrap gap-2 sm:gap-4 mb-3 sm:mb-6">
                        {property.rooms && (
                          <div className="flex items-center px-3 py-1 bg-indigo-50 rounded-full">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-sm sm:text-base text-gray-700">
                              {property.rooms} {t('filters.rooms')}
                            </span>
                          </div>
                        )}
                        {property.area && (
                          <div className="flex items-center px-3 py-1 bg-indigo-50 rounded-full">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4M4 16l5-5m11 5V20m0 0h-4m4 0l-5-5" />
                            </svg>
                            <span className="text-sm sm:text-base text-gray-700">{property.area} {t('squareMeters')}</span>
                          </div>
                        )}
                      </div>

                      {/* Description Section */}
                      <div className="mb-3 sm:mb-6">
                        <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <h4 className="text-base sm:text-lg font-bold">{t('addProperty.form.description')}</h4>
                        </div>
                        <div className="bg-white rounded-b-lg sm:rounded-b-xl p-2 sm:p-3 border border-gray-100 shadow-sm">
                          <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line">
                            {property.description || t('common.noDescription')}
                          </p>
                        </div>
                      </div>

                      {/* Features Section */}
                      {property.features && property.features.length > 0 && (
                        <div className="mb-3 sm:mb-6">
                          <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <h4 className="text-base sm:text-lg font-bold">{t('filters.features')}</h4>
                          </div>
                          <div className="bg-white rounded-b-lg sm:rounded-b-xl p-2 sm:p-3 border border-gray-100 shadow-sm">
                            <div className="grid grid-cols-2 gap-1 sm:gap-2">
                              {property.features.map((feature, index) => (
                                <div key={index} className="flex items-center">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-sm sm:text-base text-gray-700">{t(`features.${feature}`)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Location Section */}
                      <div className="mb-3 sm:mb-6">
                        <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <h4 className="text-base sm:text-lg font-bold">{t('addProperty.form.mapLocation')}</h4>
                        </div>
                        <div className="bg-white rounded-b-lg sm:rounded-b-xl p-2 sm:p-3 border border-gray-100 shadow-sm">
                          <p className="text-sm sm:text-base text-gray-700">
                            {property.city?.name}, {property.location}
                          </p>
                        </div>
                      </div>

                      {/* Contact Section */}
                      <div className="mb-3 sm:mb-6">
                        <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <h4 className="text-base sm:text-lg font-bold">{t('footer.contacts')}</h4>
                        </div>
                        <div className="bg-white rounded-b-lg sm:rounded-b-xl p-2 sm:p-3 border border-gray-100 shadow-sm">
                          <div className="space-y-1 sm:space-y-2">
                            {property.user?.name && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-sm sm:text-base text-gray-700">{property.user.name}</span>
                              </div>
                            )}
                            {property.user?.phone && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                      {/* Share Section */}
                      <div className="mb-3 sm:mb-6">
                        <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 11-6 0 3 3 0 016 0zm-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <h4 className="text-base sm:text-lg font-bold">{t('common.share')}</h4>
                        </div>
                        <div className="bg-white rounded-b-lg sm:rounded-b-xl p-2 sm:p-3 border border-gray-100 shadow-sm">
                          <div className="flex gap-3 justify-center items-center">
                            <button
                              onClick={handleCopyLink}
                              className="p-2 sm:p-3 rounded-full bg-indigo-100 text-[#1E3A8A] hover:bg-indigo-200 transition-colors"
                              title={t('common.copyLink')}
                              aria-label={t('common.copyLink')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                              {isCopied && (
                                <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                              )}
                            </button>
                            <a
                              href={getShareUrl('telegram')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 sm:p-3 rounded-full bg-blue-100 text-[#0088cc] hover:bg-blue-200 transition-colors"
                              title={t('common.shareViaTelegram')}
                              aria-label={t('common.shareViaTelegram')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                              </svg>
                            </a>
                            <a
                              href={getShareUrl('whatsapp')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 sm:p-3 rounded-full bg-green-100 text-[#25D366] hover:bg-green-200 transition-colors"
                              title={t('common.shareViaWhatsApp')}
                              aria-label={t('common.shareViaWhatsApp')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.812 2.343c-.596-.549-3.039-2.125-8.419-2.14a.9.9 0 0 0-.034 0c-2.224 0-4.088.413-5.628 1.188-1.347.679-2.288 1.647-2.79 2.868C3.092 5.887 2.938 7.863 2.924 9.9v.03a22.79 22.79 0 0 0 .321 4.316c.166.764.421 1.505.938 2.114a4.34 4.34 0 0 0 2.282 1.62c.868.202 1.344-.054 1.65-.307a.98.98 0 0 0 .374-.62c.064-.33.166-.85.24-1.238.142-.747.26-1.43.368-1.55.22-.203.284-.462.25-.72-.038-.267-.188-.383-.345-.485-.117-.069-.236-.146-.351-.228a9.417 9.417 0 0 1-.295-.204c-.708-.54-1.436-1.092-1.436-2.43 0-1.378.868-2.87 1.27-3.465a.521.521 0 0 0 .056-.446.516.516 0 0 0-.345-.258c-.136-.032-.282-.047-.42-.083-.151-.04-.317-.088-.498-.169-.099-.044-.216-.134-.304-.23a.55.55 0 0 1-.152-.443c.014-.131.068-.172.085-.182.353-.2.7-.306 1.103-.408.95-.24 1.745-.438 2.695-.524 1.132-.108 2.15 0 3.043.338.446.17.87.44 1.24.798.114.11.218.236.31.374 1.075-.686 2.073-1.517 2.693-2.184a.59.59 0 0 0 .109-.627c-.249-.498-.944-.768-1.298-.95a7.19 7.19 0 0 0-1.435-.595c-1.233-.324-2.719-.395-4.23-.244.157-1.283.708-2.34 1.636-3.132 1.016-.866 2.496-1.321 4.484-1.332C16.77.366 18.936 1.52 19.432 1.972c.204.185.353.371.437.549.088.186.122.364.122.515 0 .51-.22.884-.625 1.408-1.484 1.924-4.348 3.855-7.45 4.465-.622.122-1.175.182-1.69.193-2.27.066-3.639-1.08-3.833-3.224-.022-.243-.24-.438-.492-.438a.49.49 0 0 0-.489.489c0 .37.046.733.11 1.085.319 1.773 1.546 3.136 3.428 3.805.587.21 1.237.325 1.9.345.237.007.476.007.715 0 .976-.029 1.88-.125 2.797-.299 4.056-.762 7.568-3.312 9.066-5.574.437-.659.89-1.463.89-2.522a3.3 3.3 0 0 0-.145-1.011 2.553 2.553 0 0 0-.5-.885zM9.591 14.662c-1.27-.492-2.425-1.044-3.578-1.599-.203-.099-1.066-.357-1.264-.058-.198.3.021.564.092.794.145.47.326.93.507 1.392.108.275.215.551.326.828.17.428.228.632.058.767-.1.08-.298.128-.54.102a4.338 4.338 0 0 1-2.334-1.19 4.05 4.05 0 0 1-.892-1.764 22.293 22.293 0 0 1-.315-4.137c.014-2.12.186-3.851.893-5.098.31-.55.781-1.216 1.532-1.756C5.218 2.067 6.853 1.7 8.843 1.7a.731.731 0 0 1 .028 0c4.777.014 7.136 1.316 7.694 1.82.291.268.411.683.313 1.088-.104.431-.37.806-.695 1.101-.56.507-1.209 1.007-1.852 1.477.042-.035.084-.07.128-.106.162-.131.296-.219.41-.315.116-.098.215-.194.327-.306.074-.073.159-.156.275-.266.138-.13.276-.195.417-.195a.463.463 0 0 1 .333.132.5.5 0 0 1 .123.334c0 .267-.318.668-.471.849-.56.664-.96 1.085-1.26 1.36-1.353 1.242-2.445 1.869-3.703 2.122-1.619.325-2.807-.25-3.45-.814-.555-.488-.932-1.124-1.122-1.89a3.11 3.11 0 0 1-.106-.538.472.472 0 0 1 .012-.177c.018-.066.078-.184.274-.213.357-.05.728.106 1.078.253.35.147.68.287.917.287.17 0 .317-.072.465-.233.425-.464.14-1.718-.158-2.488-.365-.933-1.213-1.507-2.271-1.546-1.313-.047-2.522.82-2.948 2.079-.14.42-.194.864-.169 1.34.001.023.001.045.003.066l.054.889c-.092.41-.243.785-.438 1.114-.032.053-.058.11-.088.164a4.32 4.32 0 0 0-.116.215c-.072.14-.145.282-.211.429-.089.195-.168.421-.232.706a.443.443 0 0 1-.283.33c-.118.043-.244.036-.346-.028-.212-.133-.43-.313-.645-.651-.291-.459-.497-1.062-.625-1.885a6.627 6.627 0 0 1-.065-.748c-.015-.283-.046-.57-.137-.846a.467.467 0 0 1 .145-.506c.136-.114.333-.15.542-.173.21-.023.423-.031.564-.086.23-.078.418-.26.535-.514a1.92 1.92 0 0 0 .148-.52c.072-.431.047-.878-.058-1.296.634-.712 1.536-1.194 2.582-1.194.599 0 1.19.135 1.72.402.33.166.61.445.758.809a1.8 1.8 0 0 1 .092.221l.162.015c.288.023.581.037.899.037 1.384 0 2.858-.282 4.4-.844.879-.32 1.724-.837 2.486-1.455a6.293 6.293 0 0 0 1.168-1.125c.22-.28.432-.58.624-.906.101-.174.237-.418.251-.737.007-.144-.004-.298-.037-.483-.099-.557-.323-1.026-.655-1.402l-.166-.187c-.208-.243-.464-.483-.736-.695-.571-.45-1.563-.857-2.79-1.146a8.051 8.051 0 0 0-1.466-.214 11.952 11.952 0 0 0-1.17-.008c-1.952.05-3.16.42-3.884.796a2.48 2.48 0 0 0-.9.834c-.145.227-.244.472-.292.736-.051.281-.07.56-.058.851.028.7.148 1.425.517 2.084.37.659.962 1.256 1.807 1.668.915.446 2.1.656 3.483.466.312-.042.622-.106.921-.185 1.069-.28 2.059-.797 2.94-1.45a1.303 1.303 0 0 1-.064.06c-.146.135-.284.262-.408.381-.35.336-.662.625-.941.883-.14.13-.266.246-.384.353a5.793 5.793 0 0 0-.329.317 1.315 1.315 0 0 0-.22.285c-.138.226-.212.49-.197.792.019.383.178.702.44.916.458.375 1.082.511 1.894.338a6.96 6.96 0 0 0 3.297-1.887l.084-.08c.255-.244.37-.57.396-.874.039-.463-.119-.899-.292-1.278-.206-.452-.476-.867-.756-1.26l.297.274a3.583 3.583 0 0 1 .726.863c.145.256.267.543.335.855.073.334.099.674.061.994a1.93 1.93 0 0 1-.522 1.188c-1.466 1.769-3.646 3.127-6.141 3.837a14.94 14.94 0 0 1-1.857.438c-1.216.199-2.371.209-3.372-.068-1.008-.277-1.811-.843-2.285-1.627a3.188 3.188 0 0 1-.315-.604 1.47 1.47 0 0 1-.097-.683c.015-.198.078-.381.199-.518.059-.069.13-.124.209-.17l.138-.079c.338-.185.553-.292.727-.394.174-.102.309-.198.455-.37.169-.2.267-.46.254-.736a.96.96 0 0 0-.197-.539 1.058 1.058 0 0 0-.455-.342.862.862 0 0 0-.292-.059 1.038 1.038 0 0 0-.501.133 1.427 1.427 0 0 0-.344.271c-.248.252-.464.505-.67.752a1.764 1.764 0 0 0-.255.424 1.633 1.633 0 0 0-.177.914c.017.266.056.521.139.757z"/>
                              </svg>
                            </a>
                            <a
                              href={getShareUrl('viber')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 sm:p-3 rounded-full bg-purple-100 text-[#7360f2] hover:bg-purple-200 transition-colors"
                              title={t('common.shareViaViber')}
                              aria-label={t('common.shareViaViber')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.812 2.343c-.596-.549-3.039-2.125-8.419-2.14a.9.9 0 0 0-.034 0c-2.224 0-4.088.413-5.628 1.188-1.347.679-2.288 1.647-2.79 2.868C3.092 5.887 2.938 7.863 2.924 9.9v.03a22.79 22.79 0 0 0 .321 4.316c.166.764.421 1.505.938 2.114a4.34 4.34 0 0 0 2.282 1.62c.868.202 1.344-.054 1.65-.307a.98.98 0 0 0 .374-.62c.064-.33.166-.85.24-1.238.142-.747.26-1.43.368-1.55.22-.203.284-.462.25-.72-.038-.267-.188-.383-.345-.485-.117-.069-.236-.146-.351-.228a9.417 9.417 0 0 1-.295-.204c-.708-.54-1.436-1.092-1.436-2.43 0-1.378.868-2.87 1.27-3.465a.521.521 0 0 0 .056-.446.516.516 0 0 0-.345-.258c-.136-.032-.282-.047-.42-.083-.151-.04-.317-.088-.498-.169-.099-.044-.216-.134-.304-.23a.55.55 0 0 1-.152-.443c.014-.131.068-.172.085-.182.353-.2.7-.306 1.103-.408.95-.24 1.745-.438 2.695-.524 1.132-.108 2.15 0 3.043.338.446.17.87.44 1.24.798.114.11.218.236.31.374 1.075-.686 2.073-1.517 2.693-2.184a.59.59 0 0 0 .109-.627c-.249-.498-.944-.768-1.298-.95a7.19 7.19 0 0 0-1.435-.595c-1.233-.324-2.719-.395-4.23-.244.157-1.283.708-2.34 1.636-3.132 1.016-.866 2.496-1.321 4.484-1.332C16.77.366 18.936 1.52 19.432 1.972c.204.185.353.371.437.549.088.186.122.364.122.515 0 .51-.22.884-.625 1.408-1.484 1.924-4.348 3.855-7.45 4.465-.622.122-1.175.182-1.69.193-2.27.066-3.639-1.08-3.833-3.224-.022-.243-.24-.438-.492-.438a.49.49 0 0 0-.489.489c0 .37.046.733.11 1.085.319 1.773 1.546 3.136 3.428 3.805.587.21 1.237.325 1.9.345.237.007.476.007.715 0 .976-.029 1.88-.125 2.797-.299 4.056-.762 7.568-3.312 9.066-5.574.437-.659.89-1.463.89-2.522a3.3 3.3 0 0 0-.145-1.011 2.553 2.553 0 0 0-.5-.885zM9.591 14.662c-1.27-.492-2.425-1.044-3.578-1.599-.203-.099-1.066-.357-1.264-.058-.198.3.021.564.092.794.145.47.326.93.507 1.392.108.275.215.551.326.828.17.428.228.632.058.767-.1.08-.298.128-.54.102a4.338 4.338 0 0 1-2.334-1.19 4.05 4.05 0 0 1-.892-1.764 22.293 22.293 0 0 1-.315-4.137c.014-2.12.186-3.851.893-5.098.31-.55.781-1.216 1.532-1.756C5.218 2.067 6.853 1.7 8.843 1.7a.731.731 0 0 1 .028 0c4.777.014 7.136 1.316 7.694 1.82.291.268.411.683.313 1.088-.104.431-.37.806-.695 1.101-.56.507-1.209 1.007-1.852 1.477.042-.035.084-.07.128-.106.162-.131.296-.219.41-.315.116-.098.215-.194.327-.306.074-.073.159-.156.275-.266.138-.13.276-.195.417-.195a.463.463 0 0 1 .333.132.5.5 0 0 1 .123.334c0 .267-.318.668-.471.849-.56.664-.96 1.085-1.26 1.36-1.353 1.242-2.445 1.869-3.703 2.122-1.619.325-2.807-.25-3.45-.814-.555-.488-.932-1.124-1.122-1.89a3.11 3.11 0 0 1-.106-.538.472.472 0 0 1 .012-.177c.018-.066.078-.184.274-.213.357-.05.728.106 1.078.253.35.147.68.287.917.287.17 0 .317-.072.465-.233.425-.464.14-1.718-.158-2.488-.365-.933-1.213-1.507-2.271-1.546-1.313-.047-2.522.82-2.948 2.079-.14.42-.194.864-.169 1.34.001.023.001.045.003.066l.054.889c-.092.41-.243.785-.438 1.114-.032.053-.058.11-.088.164a4.32 4.32 0 0 0-.116.215c-.072.14-.145.282-.211.429-.089.195-.168.421-.232.706a.443.443 0 0 1-.283.33c-.118.043-.244.036-.346-.028-.212-.133-.43-.313-.645-.651-.291-.459-.497-1.062-.625-1.885a6.627 6.627 0 0 1-.065-.748c-.015-.283-.046-.57-.137-.846a.467.467 0 0 1 .145-.506c.136-.114.333-.15.542-.173.21-.023.423-.031.564-.086.23-.078.418-.26.535-.514a1.92 1.92 0 0 0 .148-.52c.072-.431.047-.878-.058-1.296.634-.712 1.536-1.194 2.582-1.194.599 0 1.19.135 1.72.402.33.166.61.445.758.809a1.8 1.8 0 0 1 .092.221l.162.015c.288.023.581.037.899.037 1.384 0 2.858-.282 4.4-.844.879-.32 1.724-.837 2.486-1.455a6.293 6.293 0 0 0 1.168-1.125c.22-.28.432-.58.624-.906.101-.174.237-.418.251-.737.007-.144-.004-.298-.037-.483-.099-.557-.323-1.026-.655-1.402l-.166-.187c-.208-.243-.464-.483-.736-.695-.571-.45-1.563-.857-2.79-1.146a8.051 8.051 0 0 0-1.466-.214 11.952 11.952 0 0 0-1.17-.008c-1.952.05-3.16.42-3.884.796a2.48 2.48 0 0 0-.9.834c-.145.227-.244.472-.292.736-.051.281-.07.56-.058.851.028.7.148 1.425.517 2.084.37.659.962 1.256 1.807 1.668.915.446 2.1.656 3.483.466.312-.042.622-.106.921-.185 1.069-.28 2.059-.797 2.94-1.45a1.303 1.303 0 0 1-.064.06c-.146.135-.284.262-.408.381-.35.336-.662.625-.941.883-.14.13-.266.246-.384.353a5.793 5.793 0 0 0-.329.317 1.315 1.315 0 0 0-.22.285c-.138.226-.212.49-.197.792.019.383.178.702.44.916.458.375 1.082.511 1.894.338a6.96 6.96 0 0 0 3.297-1.887l.084-.08c.255-.244.37-.57.396-.874.039-.463-.119-.899-.292-1.278-.206-.452-.476-.867-.756-1.26l.297.274a3.583 3.583 0 0 1 .726.863c.145.256.267.543.335.855.073.334.099.674.061.994a1.93 1.93 0 0 1-.522 1.188c-1.466 1.769-3.646 3.127-6.141 3.837a14.94 14.94 0 0 1-1.857.438c-1.216.199-2.371.209-3.372-.068-1.008-.277-1.811-.843-2.285-1.627a3.188 3.188 0 0 1-.315-.604 1.47 1.47 0 0 1-.097-.683c.015-.198.078-.381.199-.518.059-.069.13-.124.209-.17l.138-.079c.338-.185.553-.292.727-.394.174-.102.309-.198.455-.37.169-.2.267-.46.254-.736a.96.96 0 0 0-.197-.539 1.058 1.058 0 0 0-.455-.342.862.862 0 0 0-.292-.059 1.038 1.038 0 0 0-.501.133 1.427 1.427 0 0 0-.344.271c-.248.252-.464.505-.67.752a1.764 1.764 0 0 0-.255.424 1.633 1.633 0 0 0-.177.914c.017.266.056.521.139.757z"/>
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                
                  {/* Карта - видна только на мобильных */}
                  <div className="block lg:hidden mt-3 sm:mt-6">
                    {property.coordinates && (
                      <div className="mb-2">
                        <div className="bg-[#1E3A8A] text-white p-2 sm:p-3 rounded-t-lg sm:rounded-t-xl flex items-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <h4 className="text-base sm:text-lg font-bold">{t('addProperty.form.mapLocation')}</h4>
                        </div>
                        <div className="bg-white rounded-b-lg sm:rounded-b-xl p-0 border border-gray-100 shadow-sm">
                          <div className="h-[200px] sm:h-[250px] rounded-b-lg sm:rounded-b-lg overflow-hidden">
                            <PropertyMap
                              center={[property.coordinates.lng, property.coordinates.lat]}
                              zoom={14}
                              properties={[mapProperty]}
                              onMarkerPlace={() => {}}
                              allowMarkerPlacement={false}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Полноэкранный просмотр изображений, z-index специально выше модального окна */}
      <Transition.Root show={isFullScreenOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-hidden" onClose={() => setIsFullScreenOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-95" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            {/* Кнопка закрытия */}
            <button
              onClick={() => setIsFullScreenOpen(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Изображение */}
            <div className="w-full h-full flex items-center justify-center">
              {property.images && property.images.length > 0 && (
                <img
                  src={property.images[currentImageIndex]}
                  alt={property.title}
                  className="max-h-[85vh] max-w-[95vw] object-contain"
                />
              )}
            </div>

            {/* Навигационные кнопки */}
            {property.images && property.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Счетчик фотографий */}
            {property.images && property.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 text-white rounded-full text-sm">
                {currentImageIndex + 1} / {property.images.length}
              </div>
            )}
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}
