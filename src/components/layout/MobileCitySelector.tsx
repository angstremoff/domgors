import React, { useState } from 'react';
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCity } from '../../contexts/CityContext';
import { useTranslation } from 'react-i18next';

/**
 * Упрощенная версия селектора города для мобильных устройств
 */
const MobileCitySelector: React.FC = () => {
  const { t } = useTranslation();
  const { cities, selectedCity, selectCity } = useCity();
  const [showList, setShowList] = useState(false);

  // Открываем/закрываем список городов
  const toggleCityList = () => {
    setShowList(!showList);
  };

  // Выбираем город и закрываем список
  const handleCitySelect = (city: any) => {
    selectCity(city);
    setShowList(false);
  };

  // Сбрасываем выбор города и закрываем список
  const handleClearCity = () => {
    selectCity(null);
    setShowList(false);
  };

  return (
    <div className="relative w-full h-full">
      {/* Кнопка выбора города */}
      <button
        onClick={toggleCityList}
        className="w-full h-full flex items-center justify-center text-white"
      >
        <MapPinIcon className="h-5 w-5 mr-1" />
        <span className="truncate">
          {selectedCity ? t(`cities.${selectedCity.name}`, {defaultValue: selectedCity.name}) : t('common.allCities')}
        </span>
      </button>

      {/* Выпадающий список городов */}
      {showList && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex flex-col justify-start items-center" style={{ touchAction: 'none' }}>
          <div className="bg-white rounded-b-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-primary-600">
              <h3 className="text-lg font-semibold text-white">
                {t('common.selectCity')}
              </h3>
              <button 
                onClick={toggleCityList}
                className="text-white hover:text-gray-200 active:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-3 border-b">
              <button
                className="w-full text-left py-3 px-4 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-primary-600 font-medium text-base"
                onClick={handleClearCity}
              >
                {t('common.allCities')}
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-2 px-3">
              {cities.map((city) => (
                <button
                  key={city.id}
                  className="w-full text-left py-3 px-4 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-base mb-1"
                  onClick={() => handleCitySelect(city)}
                >
                  {t(`cities.${city.name}`, {defaultValue: city.name})}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCitySelector;
