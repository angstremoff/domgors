import imageCompression from 'browser-image-compression';

/**
 * Функция для сжатия изображений перед загрузкой
 * 
 * @param file - Файл изображения для сжатия
 * @param maxSizeMB - Максимальный размер в MB (по умолчанию 1 МБ)
 * @returns Сжатый файл или оригинальный файл, если сжатие не требуется
 */
export async function compressImage(file: File, maxSizeMB: number = 1): Promise<File> {
  // Если файл меньше maxSizeMB, возвращаем его без изменений
  if (file.size <= maxSizeMB * 1024 * 1024) {
    // Возвращаем оригинальный файл, если он уже достаточно маленький
    return file;
  }

  try {
    // Настройки сжатия
    const options = {
      maxSizeMB: maxSizeMB,        // Максимальный размер в МБ
      maxWidthOrHeight: 1280,      // Максимальная ширина/высота
      useWebWorker: true,          // Использование веб-воркера для фоновой обработки
      preserveExif: false,         // Не сохраняем EXIF данные (меньше размер)
      fileType: file.type as any,  // Сохраняем тип файла
      initialQuality: 0.7,         // Начальное качество сжатия
    };

    // Сжимаем изображение
    const compressedFile = await imageCompression(file, options);
    
    console.log('Исходный размер:', Math.round(file.size / 1024), 'KБ');
    console.log('Сжатый размер:', Math.round(compressedFile.size / 1024), 'KБ');
    
    return compressedFile;
  } catch (error) {
    console.error('Ошибка при сжатии изображения:', error);
    // В случае ошибки возвращаем исходный файл
    return file;
  }
}

/**
 * Опциональная функция: проверка размера изображения и тип
 * 
 * @param file - Файл для проверки
 * @returns true если файл - изображение и не превышает 5MB
 */
export function validateImage(file: File): { valid: boolean; message?: string } {
  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    return { valid: false, message: 'Можно загружать только изображения' };
  }
  
  // Проверяем размер файла (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, message: 'Размер файла не должен превышать 5MB' };
  }
  
  return { valid: true };
}
