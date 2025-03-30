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
  const [isMapExpanded, setIsMapExpanded] = useState(false)

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
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  const getShareUrl = (platform: string) => {
    const propertyUrl = `${window.location.origin}?propertyId=${property.id}`
    const title = encodeURIComponent(property.title)
    
    switch (platform) {
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(propertyUrl)}&text=${title}`
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(property.title + " " + propertyUrl)}`
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

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length)
    }
  }

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (property.images && property.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)
    }
  }

  return (
    <>
      {/* Основное модальное окно */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-left sm:p-0 sm:items-center pt-14 sm:pt-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-[95%] max-w-6xl bg-gray-100 rounded-xl shadow-xl overflow-y-auto relative max-h-[90vh]">
                  <div className="sticky top-2 sm:top-2 right-0 z-30 flex items-center gap-1 sm:gap-2 p-2 sm:p-2 justify-end bg-gray-100">
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
                  <div className="p-3 sm:p-4 bg-gray-100">
                    {/* Two column layout */}
                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-6 bg-gray-100">
                      {/* Left column: Images and Map */}
                      <div className="lg:w-[60%] flex flex-col bg-gray-100">
                        {/* Property Images */}
                        <div className="mb-3 sm:mb-6 relative rounded-lg sm:rounded-xl overflow-hidden bg-gray-100">
                          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                            {property.status === 'sold' && (
                              <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="bg-black/80 text-white px-4 py-1.5 rounded-full text-base font-semibold">
                                  {property.type === 'sale' ? t('status.sold') : t('status.rented')}
                                </div>
                              </div>
                            )}
                            {property.images && property.images.length > 0 ? (
                              <div className="image-container bg-gray-100">
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
                                  <div className="image-navigation bg-gray-100">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); prevImage(e); }}
                                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 text-gray-800 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); nextImage(e); }}
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
                              'px-2 py-0.5 rounded-full text-xs font-medium text-white',
                              property.type === 'sale' ? 'bg-emerald-500' : 'bg-blue-500'
                            ].join(' ')}>
                              {t(`transactionTypes.${property.type}`)}
                            </div>
                            <div className={[
                              'px-2 py-0.5 rounded-full text-xs font-medium text-white',
                              property.property_type === 'apartment' && 'bg-violet-600',
                              property.property_type === 'house' && 'bg-orange-500',
                              property.property_type === 'commercial' && 'bg-cyan-600',
                              property.property_type === 'land' && 'bg-lime-600'
                            ].filter(Boolean).join(' ')}>
                              {t(`propertyTypes.${property.property_type}`)}
                            </div>
                          </div>
                        </div>

                        {/* Расположение на карте */}
                        {property.coordinates && (
                          <div className="mb-2">
                            <h4 className="text-lg font-bold mb-2 text-left">{t('property.location')}</h4>
                            <p className="text-sm sm:text-base text-gray-700 mb-2 text-left">
                              {property.city?.name}, {property.location}
                            </p>
                            
                            {/* Кнопка для мобильных устройств */}
                            <button 
                              className="flex items-center justify-between w-full lg:hidden bg-white p-2 rounded-lg mb-2 shadow-sm text-left" 
                              onClick={() => setIsMapExpanded(!isMapExpanded)}
                            >
                              <span>{isMapExpanded ? t('common.hide') : t('common.showMap')}</span>
                              <svg 
                                className={`w-5 h-5 transition-transform ${isMapExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            <div className={`rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 transition-all ${!isMapExpanded ? 'h-0 lg:h-auto overflow-hidden lg:overflow-visible' : 'h-[200px]'}`}>
                              <div className={`h-full sm:h-[250px] rounded-lg sm:rounded-xl overflow-hidden`}>
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

                      {/* Right column: Property Info */}
                      <div className="lg:w-[40%] bg-gray-100">
                        {/* Property Title and Price */}
                        <div className="mb-5 sm:mb-7 bg-gray-100">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-left">{property.title}</h2>
                          <p className="text-2xl sm:text-3xl text-gray-900 font-semibold flex items-baseline mt-1 sm:mt-2 text-left">
                            {property.price.toLocaleString()} €
                            {property.type === 'rent' && <span className="text-sm opacity-75 ml-1">{t('perMonth')}</span>}
                          </p>
                        </div>

                        {/* Property Quick Stats */}
                        <div className="flex flex-wrap gap-2 sm:gap-4 mb-5 sm:mb-7 bg-gray-100">
                          {property.rooms && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                              </svg>
                              <span className="text-sm sm:text-base text-gray-700">{property.rooms} {t('common.rooms')}</span>
                            </div>
                          )}
                          {property.area && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v16H4V4m4 4h8v8H8V8z" />
                              </svg>
                              <span className="text-sm sm:text-base text-gray-700">{property.area} м²</span>
                            </div>
                          )}
                        </div>

                        {/* Description Section */}
                        <div className="mb-6 sm:mb-8 bg-gray-100">
                          <h4 className="text-lg font-bold mb-2 text-left">{t('addProperty.form.description')}</h4>
                          <div className="text-sm sm:text-base text-gray-700 whitespace-pre-line text-left">
                            {property.description || t('common.noDescription')}
                          </div>
                        </div>

                        {/* Features Section */}
                        {property.features && property.features.length > 0 && (
                          <div className="mb-6 sm:mb-8 bg-gray-100">
                            <h4 className="text-lg font-bold mb-2 text-left">{t('filters.features')}</h4>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                        )}

                        {/* Contact Section */}
                        <div className="mb-6 sm:mb-8 bg-gray-100">
                          <h4 className="text-lg font-bold mb-2 text-left">{t('profile.contacts')}</h4>
                          <div className="space-y-1 sm:space-y-2">
                            {property.user?.name && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-sm sm:text-base text-gray-700">{property.user.name}</span>
                              </div>
                            )}
                            
                            {property.user?.phone && (
                              <div className="flex">
                                {!isPhoneVisible ? (
                                  <button 
                                    onClick={() => setIsPhoneVisible(true)}
                                    className="bg-green-500 hover:bg-green-600 transition-colors text-white rounded-lg py-2.5 px-4 sm:px-5 font-medium flex items-center justify-center max-w-xs text-left"
                                  >
                                    <svg className="w-5 h-5 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {t('property.showPhone')}
                                  </button>
                                ) : (
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="text-sm sm:text-base text-gray-700">{property.user.phone}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Share Section */}
                        <div className="mb-6 sm:mb-8 bg-gray-100">
                          <p className="text-lg font-medium mb-4 text-left">{t('common.share')}</p>
                          <div className="flex space-x-3 mt-2">
                            <button
                              onClick={handleCopyLink}
                              className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full relative"
                              aria-label={t('common.copyLink')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
                                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                              className="flex items-center justify-center w-12 h-12 bg-[#0088cc] text-white rounded-full"
                              aria-label={t('common.shareViaTelegram')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                              </svg>
                            </a>
                            <a
                              href={getShareUrl('whatsapp')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center w-12 h-12 bg-[#25D366] text-white rounded-full"
                              aria-label={t('common.shareViaWhatsApp')}
                            >
                              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Полноэкранный просмотр изображений, z-index специально выше модального окна */}
      <Transition.Root show={isFullScreenOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="fixed inset-0 z-50 overflow-hidden" 
          onClose={() => {
            // Если мы в полноэкранном режиме, не закрываем основное модальное окно
            if (isFullScreenOpen) {
              setIsFullScreenOpen(false);
              // Предотвращаем распространение события, чтобы не закрывать основное модальное окно
              if (typeof window !== 'undefined') {
                setTimeout(() => {
                  const events = ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
                  events.forEach(event => {
                    window.addEventListener(event, (e) => {
                      e.stopPropagation();
                    }, { once: true, capture: true });
                  });
                }, 0);
              }
            }
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-95" onClick={(e) => e.stopPropagation()} />
          </Transition.Child>

          <div 
            className="fixed inset-0 flex items-center justify-center p-4" 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {/* Кнопка закрытия */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsFullScreenOpen(false);
              }}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Изображение */}
            <div 
              className="w-full h-full flex items-center justify-center" 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              {property.images && property.images.length > 0 && (
                <img
                  src={property.images[currentImageIndex]}
                  alt={property.title}
                  className="max-h-[85vh] max-w-[95vw] object-contain"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                />
              )}
            </div>

            {/* Навигационные кнопки */}
            {property.images && property.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    prevImage(e);
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
                    e.preventDefault();
                    nextImage(e);
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
