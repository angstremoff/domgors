import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Logger } from './logger';

/**
 * Функция для сжатия изображений перед загрузкой в Supabase
 * Работает аналогично веб-версии, но использует нативные возможности
 * 
 * @param uri - URI изображения для сжатия
 * @param maxSizeMB - Целевой размер в МБ (по умолчанию 0.4 МБ = 400 КБ)
 * @returns Объект с URI сжатого изображения
 */
export async function compressImage(uri: string, maxSizeMB: number = 0.4): Promise<{ uri: string }> {
  try {
    Logger.debug('Начинаем сжатие изображения:', uri);
    
    if (!uri) {
      Logger.error('Пустой URI изображения');
      throw new Error('Пустой URI изображения');
    }
    
    // Начинаем с качества 0.7 (70%)
    let quality = 0.7;
    
    // Если размер очень большой, уменьшаем качество
    if (maxSizeMB < 0.3) {
      quality = 0.5;
    }
    
    try {
      const compressed = await manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }], // Максимальная ширина 1280px
        { compress: quality, format: SaveFormat.JPEG }
      );
      
      Logger.debug('Сжатие выполнено успешно');
      Logger.debug('Исходный URI:', uri);
      Logger.debug('Сжатый URI:', compressed.uri);
      Logger.debug('Использовано качество:', quality);
      
      return { uri: compressed.uri };
    } catch (manipulateError) {
      Logger.error('Ошибка при манипуляции с изображением:', manipulateError);
      // Пробуем с меньшим качеством, если первая попытка не удалась
      try {
        const compressed = await manipulateAsync(
          uri,
          [{ resize: { width: 800 } }], // Уменьшаем размер еще больше
          { compress: 0.4, format: SaveFormat.JPEG }
        );
        
        Logger.debug('Сжатие выполнено успешно со вторым набором параметров');
        return { uri: compressed.uri };
      } catch (secondError) {
        Logger.error('Вторая попытка сжатия также не удалась:', secondError);
        // В случае ошибки возвращаем исходное изображение
        return { uri };
      }
    }
  } catch (error) {
    Logger.error('Ошибка при сжатии изображения:', error);
    // В случае ошибки возвращаем исходное изображение
    return { uri };
  }
}
