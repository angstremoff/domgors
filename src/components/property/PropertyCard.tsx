import { useState } from 'react'
import PlaceholderImage from './PlaceholderImage'
import FavoriteButton from './FavoriteButton'
import PropertyModal from './PropertyModal'

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
}

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
        className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] cursor-pointer"
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
              : 'bg-emerald-500/90 text-white'
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
      <div className="p-4">
        {/* Title and Location */}
        <div className="mb-3">
          <h3 className="font-medium text-gray-900 line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-1">{location}</p>
        </div>

        {/* Features */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {rooms} комн.
            </span>
          </div>
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
