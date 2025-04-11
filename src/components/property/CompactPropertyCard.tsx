import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FavoriteButton from './FavoriteButton';
import PropertyModal from './PropertyModal';
import PlaceholderImage from './PlaceholderImage';
import { Property } from '../../contexts/PropertyContext';

interface CompactPropertyCardProps {
  property: Property;
}

const CompactPropertyCard: React.FC<CompactPropertyCardProps> = ({ property }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useTranslation();
  
  const {
    id,
    title,
    price,
    rooms,
    area,
    images,
    type,
    property_type
  } = property;

  return (
    <>
      <div 
        className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
        data-property-id={id}
      >
        {/* Изображение */}
        <div className="relative aspect-[4/3]">
          {/* Status Badge */}
          {property.status === 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 text-white text-xs font-medium">
              {t(`status.${property.type === 'sale' ? 'sold' : 'rented'}`)}            
            </div>
          )}
          
          {images && images.length > 0 ? (
            <img
              src={images[0]}
              alt={title}
              className={`w-full h-full object-cover ${property.status === 'sold' ? 'grayscale' : ''}`}
            />
          ) : (
            <div className="h-full w-full">
              <PlaceholderImage />
            </div>
          )}
          
          {/* Type badges */}
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            <div className={`
              px-1.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm ${
              type === 'sale' 
                ? 'bg-emerald-500/90 text-white'
                : 'bg-blue-500/90 text-white'
              }`
            }>
              {t(`transactionTypes.${type}`)}
            </div>
            
            <div className={`
              px-1.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm ${
              property_type === 'apartment' ? 'bg-violet-600/90 text-white' :
              property_type === 'house' ? 'bg-orange-500/90 text-white' :
              property_type === 'commercial' ? 'bg-cyan-600/90 text-white' :
              'bg-lime-600/90 text-white'
              }`
            }>
              {t(`propertyTypes.${property_type}`)}
            </div>
          </div>
          
          {/* Favorite button */}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton propertyId={id} />
          </div>
          </div>
        
        {/* Информация об объявлении */}
        <div className="p-3 text-gray-900">
          {/* Price */}
          <div className="text-base font-semibold">
            {price.toLocaleString()} €
            {type === 'rent' && <span className="text-xs font-normal text-gray-300 ml-1">{t('common.perMonth')}</span>}
          </div>
          
          {/* Details */}
          <div className="mt-1 flex items-center text-sm text-gray-600 gap-2">
            {property_type !== 'land' && (
              <div className="flex items-center gap-1">
                <span className="text-sm">🛏️</span>
                <span>{rooms}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-sm">📏</span>
              <span>{area} m²</span>
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
  );
};

export default CompactPropertyCard;
