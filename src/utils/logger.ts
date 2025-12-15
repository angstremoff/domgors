interface LogLevel {
  LOG: 'log';
  WARN: 'warn'; 
  ERROR: 'error';
  DEBUG: 'debug';
}

interface LoggerConfig {
  enableInProduction: boolean;
  enableInDevelopment: boolean;
  logLevel: keyof LogLevel;
  excludeMethods?: Array<keyof LogLevel>;
}

class LoggerService {
  private config: LoggerConfig = {
    enableInProduction: false, // Безопасно отключаем в продакшн
    enableInDevelopment: true,
    logLevel: 'DEBUG',
    excludeMethods: []
  };

  private isDevelopment = __DEV__;

  private shouldLog(): boolean {
    return this.isDevelopment 
      ? this.config.enableInDevelopment 
      : this.config.enableInProduction;
  }

  log(...args: unknown[]): void {
    if (this.shouldLog() && !this.config.excludeMethods?.includes('LOG')) {
      console.log('[ЛОГ]', ...args);
    }
  }

  info(...args: unknown[]): void {
    this.log(...args);
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog() && !this.config.excludeMethods?.includes('WARN')) {
      console.warn('[ПРЕДУПР]', ...args);
    }
  }

  error(...args: unknown[]): void {
    // Ошибки всегда логируем для критической диагностики
    console.error('[ОШИБКА]', ...args);
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog() && this.isDevelopment && !this.config.excludeMethods?.includes('DEBUG')) {
      console.log('[ОТЛАДКА]', ...args);
    }
  }

  // Метод для безопасного логирования объектов
  logObject(label: string, obj: unknown): void {
    if (this.shouldLog()) {
      try {
        this.log(label, JSON.stringify(obj, null, 2));
      } catch (error) {
        this.error('Ошибка логирования объекта:', error);
      }
    }
  }

  // Профилирование производительности
  time(label: string): void {
    if (this.shouldLog()) {
      console.time(`[ПРОИЗВ] ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog()) {
      console.timeEnd(`[ПРОИЗВ] ${label}`);
    }
  }

  // Конфигурация logger'а (для будущих настроек)
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Экспорт singleton instance
export const Logger = new LoggerService();

// Для обратной совместимости и плавного перехода
export const logger = Logger;

// Экспорт для тех кто хочет создать свой instance
export { LoggerService };
