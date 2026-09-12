'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PropertyGalleryProps {
  images: string[];
  status?: string;
}

const SWIPE_THRESHOLD_PX = 50;
const SLIDE_TRANSITION = 'transform 350ms cubic-bezier(0.25, 0.8, 0.35, 1)';

interface DragState {
  startX: number;
  startY: number;
  pointerId: number;
  active: boolean;
}

export function PropertyGallery({ images, status }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  // dragOffset — смещение трека во время перетаскивания (px),
  // isDragging отключает CSS-переход, чтобы слайд следовал за пальцем/мышью
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  // dragMovedRef — жест был перетаскиванием, а не кликом (подавляем открытие фулскрина)
  const dragMovedRef = useRef(false);
  const { t } = useTranslation();

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, Math.max((images?.length ?? 1) - 1, 0)));
  }, [images?.length]);

  // Клавиатура в полноэкранном режиме
  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
      else if (e.key === 'Escape') setIsFullscreen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, goToNext, goToPrevious]);

  // Блокируем скролл страницы под фулскрином
  useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const isSoldOrRented = status && status !== 'active';
  const statusLabel = status === 'sold' ? t('property.status.sold') : status === 'rented' ? t('property.status.rented') : '';

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-surface flex items-center justify-center rounded-lg">
        <p className="text-textSecondary">{t('property.noImages')}</p>
      </div>
    );
  }

  const openFullscreen = (index: number) => {
    setCurrentIndex(index);
    setIsFullscreen(true);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Кнопки навигации не должны превращаться в жест: pointer capture
    // иначе перетаргетит их click на контейнер
    if ((e.target as HTMLElement).closest('button, a')) return;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, active: true };
    dragMovedRef.current = false;
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag?.active) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!dragMovedRef.current && Math.hypot(dx, dy) > 10) {
      dragMovedRef.current = true;
    }
    // Вертикальный жест оставляем браузеру (скролл страницы)
    if (Math.abs(dy) > Math.abs(dx)) {
      drag.active = false;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    // На краях галереи сдвиг демпфируется, чтобы не «отрываться» от последнего фото
    const atStart = currentIndex === 0 && dx > 0;
    const atEnd = currentIndex === images.length - 1 && dx < 0;
    setDragOffset(atStart || atEnd ? dx / 3 : dx);
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    dragStateRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    if (!drag.active) return;
    const dx = e.clientX - drag.startX;
    if (dx <= -SWIPE_THRESHOLD_PX) goToNext();
    else if (dx >= SWIPE_THRESHOLD_PX) goToPrevious();
  };

  const cancelDrag = () => {
    dragStateRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handleViewportClick = () => {
    if (!dragMovedRef.current) {
      openFullscreen(currentIndex);
    }
  };

  const arrowBaseClass =
    'absolute top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all ' +
    'opacity-60 md:opacity-0 md:group-hover:opacity-100';

  const renderSlideImage = (image: string, index: number, contain: boolean) => (
    <Image
      src={image}
      alt={t('property.photoAlt', { index: index + 1 })}
      fill
      draggable={false}
      // Соседние слайды грузим сразу, чтобы при листании не мигало
      loading={Math.abs(index - currentIndex) <= 1 ? 'eager' : 'lazy'}
      priority={index === 0 && !contain}
      sizes={contain ? '100vw' : '(max-width: 768px) 100vw, 800px'}
      className={`object-contain select-none ${isSoldOrRented ? 'grayscale' : ''}`}
    />
  );

  const dragHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: endDrag,
    onPointerCancel: cancelDrag,
  };

  const trackStyle: CSSProperties = {
    transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
    transition: isDragging ? 'none' : SLIDE_TRANSITION,
    touchAction: 'pan-y',
  };

  return (
    <>
      {/* Основная галерея */}
      <div className="space-y-4">
        {/* Главное изображение */}
        <div
          className="relative w-full h-96 md:h-[500px] bg-surface rounded-lg overflow-hidden group cursor-pointer"
          onClick={handleViewportClick}
          {...dragHandlers}
        >
          {/* Скользящий трек слайдов */}
          <div className="flex h-full" style={trackStyle}>
            {images.map((image, index) => (
              <div key={index} className="relative w-full h-full shrink-0">
                <Image
                  src={image}
                  alt={t('property.photoAlt', { index: index + 1 })}
                  fill
                  draggable={false}
                  loading={Math.abs(index - currentIndex) <= 1 ? 'eager' : 'lazy'}
                  priority={index === 0}
                  sizes="(max-width: 768px) 100vw, 800px"
                  className={`object-cover select-none ${isSoldOrRented ? 'grayscale' : ''}`}
                />
              </div>
            ))}
          </div>

          {/* Метка статуса */}
          {isSoldOrRented && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-red-600/80 text-white px-8 py-4 rounded-lg text-3xl font-bold uppercase shadow-lg">
                {statusLabel}
              </div>
            </div>
          )}

          {/* Навигация */}
          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  aria-label={t('property.prevPhoto')}
                  className={`${arrowBaseClass} left-4`}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {currentIndex < images.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  aria-label={t('property.nextPhoto')}
                  className={`${arrowBaseClass} right-4`}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Счетчик */}
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm pointer-events-none">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Миниатюры */}
        {images.length > 1 && (
          <div>
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="mb-2 text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
            >
              {showThumbnails ? t('property.hideAllPhotos') : t('property.showAllPhotos')} ({images.length})
            </button>
            {showThumbnails && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                        ? 'border-primary'
                        : 'border-transparent hover:border-border'
                      }`}
                  >
                    <Image
                      src={image}
                      alt={t('property.thumbnailAlt', { index: index + 1 })}
                      fill
                      sizes="150px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Полноэкранный режим */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95">
          {/* Кнопка закрытия */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors z-10"
            aria-label={t('property.closeFullscreen')}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Скользящий трек */}
          <div
            className="relative w-full h-full overflow-hidden"
            {...dragHandlers}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="flex h-full" style={trackStyle}>
              {images.map((image, index) => (
                <div key={index} className="relative w-full h-full shrink-0">
                  {renderSlideImage(image, index, true)}
                </div>
              ))}
            </div>
          </div>

          {/* Навигация */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                aria-label={t('property.prevPhoto')}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors disabled:opacity-30 z-10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === images.length - 1}
                aria-label={t('property.nextPhoto')}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors disabled:opacity-30 z-10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>

              {/* Счетчик */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full z-10">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
