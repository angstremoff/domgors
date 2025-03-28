import { useState } from 'react'
import PlaceholderImage from './PlaceholderImage'
import FavoriteButton from './FavoriteButton'
import PropertyModal from './PropertyModal'
import { useProperties } from '../../contexts/PropertyContext'

import type { Property } from '../../contexts/PropertyContext'

interface PropertyCardProps {
  property: Property
}

import { useTranslation } from 'react-i18next'

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { } = useProperties()
  const { t } = useTranslation()
  const {
    id,
    title,
    location,
    price,
    rooms,
    area,
    images,
    type,
  } = property

  return (
    <>
      <div 
        className="group relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] cursor-pointer h-full shadow-lg hover:shadow-xl border border-violet-100/50"
        onClick={() => setIsModalOpen(true)}
        data-property-id={id}
      >
        {/* Status Badge */}
        {property.status === 'sold' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-black/80 text-white px-6 py-2 rounded-full text-lg font-semibold backdrop-blur-sm">
            {t(`status.${property.type === 'sale' ? 'sold' : 'rented'}`)}
          </div>
        )}
        {/* Image container */}
        <div className="relative aspect-[4/3] overflow-hidden">
        {images && images.length > 0 ? (
          <img
            src={images[0]}
            alt={title}
            className={[
              'absolute inset-0 w-full h-full object-cover',
              property.status === 'sold' ? 'grayscale' : ''
            ].join(' ')}
          />
        ) : (
          <div className="absolute inset-0">
            <PlaceholderImage />
          </div>
        )}
        

        
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Type badge */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 flex gap-1 sm:gap-2">
          <div className={[
            'px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium backdrop-blur-md',
            type === 'sale' 
              ? 'bg-emerald-500/90 text-white'
              : 'bg-blue-500/90 text-white'
          ].join(' ')}>
            {t(`transactionTypes.${type}`)}
          </div>
          <div className={[
            'px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium backdrop-blur-md text-white',
            property.property_type === 'apartment' && 'bg-violet-600/90',
            property.property_type === 'house' && 'bg-orange-500/90',
            property.property_type === 'commercial' && 'bg-cyan-600/90',
            property.property_type === 'land' && 'bg-lime-600/90'
          ].filter(Boolean).join(' ')}>
            {t(`propertyTypes.${property.property_type}`)}
          </div>
        </div>

        {/* Favorite button */}
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
          <FavoriteButton propertyId={id} />
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-10">
          <p className="text-base sm:text-lg font-semibold text-white">
            {price.toLocaleString()} €
            {type === 'rent' && <span className="text-xs sm:text-sm font-normal opacity-90">/мес</span>}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 flex flex-col h-[160px] sm:h-[195px]">
        {/* Title and Location */}
        <div className="mb-1 sm:mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 min-h-[3rem] leading-snug">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 line-clamp-2">
            {property.city?.name}, {location}
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700 mt-auto">
          {property.property_type !== 'land' && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4-6h3m-3 0V9m0 6v6" />
              </svg>
              <span className="text-xs sm:text-sm">{rooms} {t('common.roomsShort')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="text-xs sm:text-sm">{area} м²</span>
          </div>
        </div>
      </div>
    </div>

    <PropertyModal
      property={property}
      open={isModalOpen}
      onClose={() => setIsModalOpen(false)}
    />
    </>
  )
}
