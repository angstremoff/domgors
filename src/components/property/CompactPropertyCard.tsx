import React, { useState, memo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FavoriteButton from './FavoriteButton';
import LazyPropertyModal from './LazyPropertyModal';
import PlaceholderImage from './PlaceholderImage';
import { Property } from '../../contexts/PropertyContext';

interface CompactPropertyCardProps {
  property: Property;
}

const CompactPropertyCard: React.FC<CompactPropertyCardProps> = ({ property }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  
  // Ленивая загрузка изображений
  useEffect(() => {
    // Создаем IntersectionObserver для отслеживания попадания элемента в область видимости
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Когда элемент становится видимым, загружаем изображение
        if (entry.isIntersecting) {
          setIsImageVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // Загружаем изображение, когда хотя бы 10% элемента видно
    );

    // Наблюдаем за элементом
    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    // Отключаем наблюдение при размонтировании компонента
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Обработчик успешной загрузки изображения
  const handleImageLoaded = () => {
    setIsImageLoaded(true);
  };
  
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
        <div ref={imageRef} className="relative aspect-[4/3]">
          {/* Status Badge */}
          {property.status === 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 text-white text-xs font-medium">
              {t(`status.${property.type === 'sale' ? 'sold' : 'rented'}`)}            
            </div>
          )}
          
          {images && images.length > 0 ? (
            isImageVisible ? (
              <>
                {/* Показываем прелоадер до загрузки изображения */}
                {!isImageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <img
                  src={images[0]}
                  alt={title}
                  loading="lazy"
                  onLoad={handleImageLoaded}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${property.status === 'sold' ? 'grayscale' : ''} ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
              </>
            ) : (
              // Показываем простой плейсхолдер, пока изображение не попало в область видимости
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            )
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
      
      <LazyPropertyModal
        property={property}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

// Оптимизируем с помощью React.memo для предотвращения ненужных перерисовок
export default memo(CompactPropertyCard, (prevProps, nextProps) => {
  // Сравниваем только ID и status, так как это основные свойства, которые могут измениться
  return (
    prevProps.property.id === nextProps.property.id &&
    prevProps.property.status === nextProps.property.status
  );
});
