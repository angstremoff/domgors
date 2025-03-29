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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
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
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
                                <path d="M11.4 0.8C9.6 0.8 4.2 1.1 2.1 5.3C1.0 7.8 0.8 10.7 0.8 13.3C0.8 16.5 0.6 22.2 6.2 23.5H6.3L6.2 26.3C6.2 26.3 6.2 27.0 6.6 27.2C7.1 27.5 7.5 27.2 8.1 26.6C8.4 26.2 9.0 25.5 9.4 25.0C13.2 25.3 16.1 24.4 16.5 24.3C17.5 24.0 22.2 23.2 23.1 16.5C24.1 9.5 22.8 5.1 21.0 2.9L21.0 2.9C20.3 2.0 16.9 0.8 11.4 0.8ZM11.5 2.5C16.3 2.5 19.0 3.4 19.4 3.9C20.8 5.5 21.7 9.5 21.0 15.1C20.2 20.5 16.6 21.0 15.8 21.2C15.5 21.3 13.0 22.0 9.9 21.9C9.9 21.9 7.4 24.7 6.6 25.5C6.5 25.6 6.4 25.7 6.3 25.7C6.1 25.7 6.1 25.5 6.1 25.3C6.1 25.0 6.2 23.1 6.2 23.1C1.4 22.0 1.8 17.2 1.8 13.3C1.8 10.8 2.0 8.3 2.9 6.2C4.6 2.8 9.1 2.5 11.5 2.5ZM12.2 7.8C11.8 7.7 11.4 8.0 11.3 8.4C11.2 8.8 11.5 9.3 11.9 9.3C13.4 9.5 14.5 10.6 14.8 12.1C14.8 12.5 15.2 12.8 15.6 12.8C16.0 12.7 16.3 12.4 16.3 12.0C15.9 9.8 14.3 8.2 12.2 7.8ZM8.4 6.2C8.2 6.2 8.0 6.2 7.8 6.3C6.8 6.6 6.2 7.1 5.8 7.5C5.2 8.1 4.8 8.8 4.8 9.7C4.7 10.3 4.8 10.9 5.1 11.4C5.5 12.1 6.0 12.7 6.7 13.5L6.7 13.5L6.7 13.5C8.2 15.6 9.7 16.7 11.5 17.4C11.9 17.5 12.2 17.6 12.6 17.6C12.7 17.6 12.7 17.6 12.8 17.6C13.4 17.6 14.0 17.4 14.6 17.0C15.1 16.5 15.5 15.8 15.6 15.0C15.6 14.5 15.5 14.1 15.2 13.7C14.9 13.1 14.5 12.7 14.0 12.2C13.5 11.8 12.8 11.9 12.5 12.3L12.2 12.7C12.0 13.0 11.6 13.0 11.6 13.0C9.5 12.1 8.5 10.0 8.4 9.8C8.4 9.8 8.3 9.4 8.7 9.2L9.1 8.9C9.5 8.6 9.6 8.0 9.3 7.6C8.9 7.0 8.6 6.4 8.2 5.8C8.0 6.1 8.7 6.2 8.4 6.2ZM12.2 7.8C11.8 7.7 11.4 8.0 11.3 8.4C11.2 8.8 11.5 9.3 11.9 9.3C13.4 9.5 14.5 10.6 14.8 12.1C14.8 12.5 15.2 12.8 15.6 12.8C16.0 12.7 16.3 12.4 16.3 12.0C15.9 9.8 14.3 8.2 12.2 7.8Z"/>
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
