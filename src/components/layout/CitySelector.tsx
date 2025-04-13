import React, { Fragment, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useCity } from '../../contexts/CityContext';
import { useTranslation } from 'react-i18next';

const CitySelector: React.FC = () => {
  const { cities, selectedCity, selectCity, isLoading, isModalOpen, setIsModalOpen } = useCity();
  const { t } = useTranslation();
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  // Открываем модальное окно для выбора города
  const openModal = () => {
    // Исправление для мобильных браузеров: закрываем мобильное меню перед открытием модального окна
    try {
      const closeBtn = document.querySelector('[aria-label="Close mobile menu"]');
      if (closeBtn) {
        (closeBtn as HTMLElement).click();
      }
    } catch (e) {
      console.error('Error closing mobile menu:', e);
    }
  
    // Даем небольшую задержку, чтобы мобильное меню успело закрыться
    setTimeout(() => {
      setIsModalOpen(true);
    }, 50);
  };

  // Закрываем модальное окно
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Обработчик выбора города
  const handleCitySelect = (city: any) => {
    selectCity(city);
    closeModal();
  };

  // Обработчик сброса выбора города
  const handleClearCity = () => {
    selectCity(null);
    closeModal();
  };

  // Отображаем кнопку выбора города
  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center justify-center w-full h-full px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-white hover:bg-white/20 active:bg-white/30 transition-all duration-200 bg-white/10 backdrop-blur-sm"
        style={{ touchAction: 'manipulation' }}
        ref={initialFocusRef}
      >
        <MapPinIcon className="h-5 w-5 mr-1" />
        {selectedCity ? (
          <span className="truncate">{t(`cities.${selectedCity.name}`, {defaultValue: selectedCity.name})}</span>
        ) : (
          <span className="truncate">{t('common.allCities')}</span>
        )}
      </button>

      {/* Модальное окно выбора города */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={closeModal}
          initialFocus={initialFocusRef}
          static
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
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
            <div className="flex min-h-full items-center justify-center p-4 text-center" tabIndex={0}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {t('common.selectCity')}
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={closeModal}
                      tabIndex={0}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Кнопка "Все города" */}
                  <button
                    className="w-full text-left py-2 px-4 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-primary-600 font-medium mb-2"
                    onClick={handleClearCity}
                    tabIndex={0}
                  >
                    {t('common.allCities')}
                  </button>

                  {/* Список городов */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoading ? (
                      <div className="py-4 text-center text-gray-500">
                        {t('common.loading')}...
                      </div>
                    ) : (
                      cities.map((city) => (
                        <button
                          key={city.id}
                          className="w-full text-left py-2 px-4 hover:bg-gray-100 active:bg-gray-200 rounded-lg"
                          onClick={() => handleCitySelect(city)}
                          tabIndex={0}
                        >
                          {t(`cities.${city.name}`, {defaultValue: city.name})}
                        </button>
                      ))
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default CitySelector;
