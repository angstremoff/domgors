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
                                <path d="M13.255.2C11.624.058 10.069 0 8.535 0 5.248 0 3.2 1.128 2.07 3.426c-.69 1.522-.824 3.42-.802 5.359.026 1.937 0 3.744.458 5.33.434 1.582 1.26 2.68 2.171 3.309.95.639 2.041.639 2.766.536.56-.091 1.323-.195 1.92-.333-.06.45-.102.916-.13 1.218a.87.87 0 00.245.721.868.868 0 00.712.272c.245 0 .49-.05.735-.152 1.262-.52 2.055-.911 2.924-1.39 2.355-.757 4.44-1.726 6.125-3.152 1.71-1.426 2.618-3.175 2.74-5.731.122-2.555.207-4.648-.434-6.786-.667-2.137-2.08-3.423-3.806-4.104C16.512.65 14.887.342 13.255.201zm.844 17.051c-.139.0177-.245.354-.59.5-.347.146-.693.243-1.04.173-.332-.071-.65-.267-.948-.614-.263-.307-.526-.628-.788-.948-.434-.533-.847-1.028-1.232-1.51 1.014.047 2.1.292 3.126.752.526.237 1.007.52 1.45.84.437.32.836.687 1.032 1.103.116.24.145.56 0 .697zm-.606-8.876c0 .0177.001.035 0 .05.0049.273.239.49.512.495.273.005.5-.208.512-.48.01-.212.01-.425.01-.637-.001-.182-.002-.363-.011-.544-.015-.273-.252-.487-.525-.471a.496.496 0 00-.471.524c.008.178.009.351.01.534 0 .176.0001.353-.037.53zm2.368.065c.007.27.24.482.512.481.273 0 .497-.215.505-.489.013-.534-.035-1.075-.144-1.589-.109-.513-.266-.982-.47-1.431-.207-.448-.462-.878-.786-1.256-.323-.378-.713-.702-1.18-.97-.467-.266-.985-.434-1.578-.52-.287-.042-.55.156-.592.442-.041.287.157.55.443.592.425.063.8.188 1.15.382.35.193.657.45.92.745.262.293.477.626.65.986.171.36.3.726.39 1.12.088.392.128.812.116 1.24 0 .089.003.178.007.267h.057zm-5.493 6.946c-.69-.33-1.254-.798-1.735-1.367-.48-.569-.834-1.21-1.092-1.893-.258-.684-.41-1.412-.423-2.157-.014-.784.09-1.588.354-2.347.264-.76.656-1.419 1.14-1.974.485-.555 1.063-1.008 1.702-1.31a4.558 4.558 0 012.175-.45c1.085.079 2.22.455 3.052 1.178.831.723 1.442 1.778 1.657 3.049.125.745.107 1.463.003 2.165-.104.702-.291 1.37-.541 2.018-.251.648-.569 1.256-.955 1.861-.387.605-.849 1.198-1.444 1.823-1.205 1.269-2.79 2.296-4.749 3.31-.098.040-.19.068-.28.091-.41-.064-.812-.196-1.132-.34-.284-.125-.553-.274-.811-.47-.313-.246-.653-.592-.92-.904zM11.472.748c1.59.126 3.104.407 4.5 1.038 1.396.63 2.606 1.69 3.136 3.392.517 1.648.474 3.585.36 5.997-.115 2.412-.93 3.783-2.306 4.94-1.377 1.151-3.305 2.063-5.514 2.766-.843.267-1.554.618-2.754 1.102.04-.376.072-.709.115-1.047a.987.987 0 00-.28-.822.985.985 0 00-.808-.27c-.66.105-1.49.2-2.143.304-.65.104-1.219.06-1.764-.208-.546-.268-1.12-1.01-1.425-2.033-.3-1.023-.33-2.537-.37-4.544-.041-2.007.124-3.814.694-5.044.86-1.867 2.33-2.755 5.256-2.755 1.431 0 2.94.058 4.529.184h.068z"/>
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
