import { lazy, Suspense } from 'react';
import type { PropertyModalProps } from './types';

// Ленивая загрузка компонента PropertyModal
const PropertyModal = lazy(() => import('./PropertyModal'));

// Спиннер загрузки для показа во время загрузки компонента
const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
  </div>
);

/**
 * Компонент для ленивой загрузки модального окна объекта недвижимости
 * Использует React.lazy и Suspense для загрузки компонента только при необходимости
 */
export default function LazyPropertyModal(props: PropertyModalProps) {
  // Если модальное окно закрыто, не рендерим компонент вообще
  if (!props.open) {
    return null;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PropertyModal {...props} />
    </Suspense>
  );
}
