/**
 * Сервис более надежного шифрования данных
 * Использует AES алгоритм шифрования через Web Crypto API
 */

// Установим алгоритм шифрования и параметры
const ALGORITHM = 'AES-GCM';
const ITERATIONS = 10000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

// Класс для работы с шифрованием данных
export class EncryptionService {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  
  /**
   * Генерирует ключ шифрования на основе пароля и соли
   */
  private async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Преобразуем пароль в ArrayBuffer
    const passwordBuffer = this.encoder.encode(password);
    
    // Создаем материал ключа из пароля
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Получаем ключ из материала используя PBKDF2
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Шифрует данные с использованием пароля
   */
  async encrypt(data: string, password: string): Promise<string> {
    try {
      // Подготавливаем данные
      const dataBuffer = this.encoder.encode(data);
      
      // Генерируем случайную соль
      const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      
      // Генерируем случайный вектор инициализации
      const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      
      // Получаем ключ шифрования
      const key = await this.generateKey(password, salt);
      
      // Шифруем данные
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        dataBuffer
      );
      
      // Объединяем соль, вектор инициализации и шифрованные данные
      const encryptedArray = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
      encryptedArray.set(salt, 0);
      encryptedArray.set(iv, salt.length);
      encryptedArray.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);
      
      // Конвертируем в base64 для хранения в localStorage
      return btoa(String.fromCharCode(...encryptedArray));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Не удалось зашифровать данные');
    }
  }
  
  /**
   * Дешифрует данные с использованием пароля
   */
  async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // Декодируем base64 в массив байтов
      const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Извлекаем соль, вектор инициализации и шифрованные данные
      const salt = encryptedBytes.slice(0, SALT_LENGTH);
      const iv = encryptedBytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const data = encryptedBytes.slice(SALT_LENGTH + IV_LENGTH);
      
      // Получаем ключ шифрования
      const key = await this.generateKey(password, salt);
      
      // Дешифруем данные
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        data
      );
      
      // Возвращаем дешифрованные данные в виде строки
      return this.decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Не удалось расшифровать данные');
    }
  }
}

/**
 * Безопасное хранилище данных с использованием шифрования
 */
export class SecureStorage {
  private encryptionService: EncryptionService;
  private encryptionPassword: string;
  
  constructor() {
    this.encryptionService = new EncryptionService();
    // Получаем "пароль" из домена и других источников энтропии
    this.encryptionPassword = this.getEncryptionPassword();
  }
  
  /**
   * Создает пароль для шифрования на основе информации из окружения
   */
  private getEncryptionPassword(): string {
    // Здесь можно использовать различные источники энтропии
    const domain = window.location.hostname || 'domgors';
    const userAgent = navigator.userAgent;
    const screenProps = `${window.screen.width}x${window.screen.height}`;
    
    // Комбинируем различные факторы для создания более уникального ключа
    return `${domain}-${userAgent.length}-${screenProps}`;
  }
  
  /**
   * Сохраняет данные в localStorage с шифрованием
   */
  async setItem(key: string, value: any): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encryptedValue = await this.encryptionService.encrypt(
        stringValue, 
        this.encryptionPassword
      );
      localStorage.setItem(key, encryptedValue);
    } catch (error) {
      console.error('Error saving secure data:', error);
      throw error;
    }
  }
  
  /**
   * Получает данные из localStorage с дешифрованием
   */
  async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      
      const decryptedValue = await this.encryptionService.decrypt(
        encryptedValue, 
        this.encryptionPassword
      );
      
      return JSON.parse(decryptedValue) as T;
    } catch (error) {
      console.error('Error reading secure data:', error);
      // При ошибке удаляем проблемные данные
      localStorage.removeItem(key);
      return null;
    }
  }
  
  /**
   * Удаляет данные из localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
  
  /**
   * Очищает все данные из localStorage
   */
  clear(): void {
    localStorage.clear();
  }
}

// Экспортируем инстанс SecureStorage для использования во всем приложении
export const secureStorage = new SecureStorage();

// Функции для обратной совместимости со старым API
export const setSecureItem = async (key: string, value: any): Promise<void> => {
  await secureStorage.setItem(key, value);
};

export const getSecureItem = async <T = any>(key: string): Promise<T | null> => {
  return secureStorage.getItem<T>(key);
};

export const removeSecureItem = (key: string): void => {
  secureStorage.removeItem(key);
};
