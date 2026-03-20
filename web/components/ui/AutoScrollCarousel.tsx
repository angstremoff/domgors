'use client';

import { Children, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface AutoScrollCarouselProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  speedPxPerSecond?: number;
  resumeDelayMs?: number;
}

export function AutoScrollCarousel({
  children,
  className,
  contentClassName,
  speedPxPerSecond = 18,
  resumeDelayMs = 1200,
}: AutoScrollCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPausedRef = useRef(false);
  const autoScrollLeftRef = useRef(0);
  const resumeTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const items = useMemo(() => Children.toArray(children).filter(Boolean), [children]);

  const duplicatedItems = useMemo(() => [...items, ...items], [items]);

  const pause = () => {
    isPausedRef.current = true;
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const scheduleResume = () => {
    if (resumeTimeoutRef.current !== null) {
      window.clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        autoScrollLeftRef.current = container.scrollLeft;
      }
      isPausedRef.current = false;
    }, resumeDelayMs);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (items.length === 0) return;

    autoScrollLeftRef.current = container.scrollLeft;
    lastTimestampRef.current = null;

    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaMs = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      if (!isPausedRef.current) {
        const halfWidth = container.scrollWidth / 2;
        if (halfWidth > container.clientWidth + 8) {
          const deltaPx = (speedPxPerSecond / 1000) * deltaMs;
          let nextScrollLeft = autoScrollLeftRef.current + deltaPx;
          if (nextScrollLeft >= halfWidth) {
            nextScrollLeft -= halfWidth;
          }
          autoScrollLeftRef.current = nextScrollLeft;
          container.scrollLeft = nextScrollLeft;
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (resumeTimeoutRef.current !== null) {
        window.clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
  }, [items.length, speedPxPerSecond]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // На тач-устройствах оставляем нативный свайп, без перехвата (чтобы не ломать вертикальный скролл страницы).
    if (e.pointerType !== 'mouse') {
      pause();
      return;
    }

    if (e.button !== 0) return;

    const container = e.currentTarget;

    pause();
    autoScrollLeftRef.current = container.scrollLeft;
    draggingRef.current = true;
    didDragRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartScrollLeftRef.current = container.scrollLeft;

    try {
      container.setPointerCapture(e.pointerId);
    } catch {
      // Ничего не делаем — без capture тоже работает.
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const container = e.currentTarget;

    const deltaX = e.clientX - dragStartXRef.current;
    if (Math.abs(deltaX) <= 3) {
      return;
    }

    didDragRef.current = true;
    e.preventDefault();

    const halfWidth = container.scrollWidth / 2;
    if (halfWidth <= 0) return;

    // Двигаем в противоположную сторону движения курсора.
    let nextScrollLeft = dragStartScrollLeftRef.current - deltaX;

    // Нормализуем, чтобы оставаться в пределах первой половины (для бесшовной цикличности).
    nextScrollLeft = ((nextScrollLeft % halfWidth) + halfWidth) % halfWidth;
    container.scrollLeft = nextScrollLeft;
    autoScrollLeftRef.current = nextScrollLeft;
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    draggingRef.current = false;
    scheduleResume();
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    endDrag(e);
  };

  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    endDrag(e);
  };

  const onTouchStart = () => {
    pause();
  };

  const onTouchEnd = () => {
    scheduleResume();
  };

  const onWheel = () => {
    if (draggingRef.current) return;
    pause();
    scheduleResume();
  };

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    // Если пользователь тащил карусель мышью — блокируем клик по карточке.
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-x-auto overscroll-x-contain no-scrollbar select-none cursor-grab active:cursor-grabbing',
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
      onDragStartCapture={(e) => e.preventDefault()}
      onClickCapture={onClickCapture}
    >
      <div className={cn('flex gap-4 pb-2 items-stretch', contentClassName)}>
        {duplicatedItems.map((child, index) => (
          <div key={index} className="flex-shrink-0 h-full">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
