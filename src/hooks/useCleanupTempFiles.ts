import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Хук для очистки временных файлов, которые остались от 
 * прерванных загрузок при создании объявлений
 */
export function useCleanupTempFiles() {
  useEffect(() => {
    const cleanupTempFiles = async () => {
      try {
        // Проверяем, есть ли временные файлы для удаления
        const tempFiles = localStorage.getItem('temp_property_files');
        
        if (tempFiles) {
          console.log('Найдены временные файлы для удаления:', tempFiles);
          const filePaths = JSON.parse(tempFiles);
          
          if (Array.isArray(filePaths) && filePaths.length > 0) {
            // Удаляем файлы из хранилища
            for (const path of filePaths) {
              const { error } = await supabase.storage
                .from('properties')
                .remove([path]);
                
              if (error) {
                console.error(`Ошибка при удалении временного файла ${path}:`, error);
              } else {
                console.log(`Успешно удален временный файл: ${path}`);
              }
            }
          }
          
          // Очищаем локальное хранилище после удаления
          localStorage.removeItem('temp_property_files');
          console.log('Очистка временных файлов завершена');
        }
      } catch (error) {
        console.error('Ошибка при очистке временных файлов:', error);
      }
    };
    
    // Запускаем очистку при инициализации хука
    cleanupTempFiles();
  }, []);
}
