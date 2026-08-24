/**
 * Сжатие изображений в web через Canvas API.
 *
 * Применяется при отправке объявления (в uploadImages/uploadNewImages),
 * чтобы в Supabase Storage уходили оптимизированные JPEG вместо raw-файлов.
 *
 * Принципы:
 * - Без внешних зависимостей — только браузерное Canvas API.
 * - Graceful fallback: при любой ошибке (старый браузер, битый файл, createImageBitmap
 *   недоступен) возвращается ОРИГИНАЛЬНЫЙ файл как Blob — загрузка не ломается.
 * - Если сжатый Blob оказался больше оригинала (бывает для уже-сжатых JPEG) —
 *   возвращается оригинал.
 * - Микро-файлы (<50KB) пропускаются без перекодировки.
 */

// Максимальная ширина в пикселях (пропорционально, как в mobile).
const COMPRESS_MAX_WIDTH = 1280;
// Качество JPEG (0.7 — баланс размера/качества, как в mobile).
const COMPRESS_QUALITY = 0.7;
// Файлы меньше этого размера не сжимаем (нет смысла, риск увеличить).
const COMPRESS_MIN_BYTES = 50 * 1024;

export interface CompressedImage {
  /** Blob для загрузки в Storage (сжатый JPEG или оригинал при fallback). */
  blob: Blob;
  /** MIME-тип для contentType при загрузке. После сжатия всегда 'image/jpeg'. */
  contentType: string;
  /** Расширение имени файла. После сжатия всегда 'jpg'. */
  extension: string;
  /** Фактически ли выполнено сжатие (для логирования/отладки). */
  compressed: boolean;
}

const FALLBACK_EXT = 'jpg';
const FALLBACK_CONTENT_TYPE = 'image/jpeg';

/**
 * Сжимает File → JPEG Blob через Canvas API.
 * Пропорциональный ресайз до COMPRESS_MAX_WIDTH по большей стороне.
 * При ошибке возвращает оригинальный файл (compressed: false).
 */
export async function compressImageFile(file: File): Promise<CompressedImage> {
  // Микро-файлы пропускаем
  if (file.size < COMPRESS_MIN_BYTES) {
    return fileToFallback(file);
  }

  // createImageBitmap доступен не во всех старых браузерах
  if (typeof createImageBitmap !== 'function') {
    return fileToFallback(file);
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);

    // Пропорциональный ресайз: если ширина <= максимума — без масштабирования,
    // только перекодировка в JPEG.
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    if (sourceWidth > COMPRESS_MAX_WIDTH) {
      const ratio = COMPRESS_MAX_WIDTH / sourceWidth;
      targetWidth = COMPRESS_MAX_WIDTH;
      targetHeight = Math.round(sourceHeight * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return fileToFallback(file);
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas, COMPRESS_QUALITY);

    // Сжатый больше оригинала — отдать оригинал (нерационально раздувать)
    if (!blob || blob.size >= file.size) {
      return fileToFallback(file);
    }

    return {
      blob,
      contentType: FALLBACK_CONTENT_TYPE,
      extension: FALLBACK_EXT,
      compressed: true,
    };
  } catch {
    // Любая ошибка декодинга/canvas/toBlob — безопасный fallback на оригинал
    return fileToFallback(file);
  } finally {
    // Освобождаем память битмапа
    if (bitmap && typeof bitmap.close === 'function') {
      try {
        bitmap.close();
      } catch {
        // игнорируем ошибку закрытия
      }
    }
  }
}

/** Оборачивает canvas.toBlob в Promise. */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      FALLBACK_CONTENT_TYPE,
      quality
    );
  });
}

/** Возвращает оригинальный файл как результат без сжатия. */
function fileToFallback(file: File): CompressedImage {
  // Определяем расширение и contentType из оригинала (как было до сжатия)
  const ext = (file.name.split('.').pop() || FALLBACK_EXT).toLowerCase();
  return {
    blob: file,
    contentType: file.type || `image/${ext}`,
    extension: ext,
    compressed: false,
  };
}
