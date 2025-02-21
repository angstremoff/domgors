import { useState } from 'react'
import PlaceholderImage from './PlaceholderImage'
import FavoriteButton from './FavoriteButton'
import PropertyModal from './PropertyModal'

import type { Property } from '../../contexts/PropertyContext'

interface PropertyCardProps {
  property: Property
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
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
        className="group relative bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] cursor-pointer h-full shadow-lg hover:shadow-xl border border-violet-100/50"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Image container */}
        <div className="relative aspect-[4/3] overflow-hidden">
        {images && images.length > 0 ? (
          <img
            src={images[0]}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0">
            <PlaceholderImage />
          </div>
        )}
        
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Type badge */}
        <div className="absolute top-4 left-4 z-10">
          <div className={[
            'px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md',
            type === 'sale' 
              ? 'bg-white/90 text-gray-900'
              : 'bg-gray-900/90 text-white'
          ].join(' ')}>
            {type === 'sale' ? 'Продажа' : 'Аренда'}
          </div>
        </div>

        {/* Favorite button */}
        <div className="absolute top-4 right-4 z-10">
          <FavoriteButton propertyId={id} />
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <p className="text-lg font-semibold text-white">
            {price.toLocaleString()} €
            {type === 'rent' && <span className="text-sm font-normal opacity-90">/мес</span>}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col h-[150px]">
        {/* Title and Location */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem] leading-snug">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-2 line-clamp-1">{location}</p>
        </div>

        {/* Features */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
          {property.property_type !== 'land' && (
            <div className="flex items-center gap-2">
              <span className="flex items-center">
                {property.property_type === 'apartment' ? (
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ) : property.property_type === 'house' ? (
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ) : property.property_type === 'commercial' ? (
                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4-6h3m-3 0V9m0 6v6" />
                  </svg>
                ) : null}
                {rooms} комн.
              </span>
            </div>
          )}
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>{area} м²</span>
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
