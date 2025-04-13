import * as Sentry from '@sentry/react';

/**
 * Инициализирует Sentry для мониторинга ошибок
 * @param dsn DSN ключ из панели управления Sentry
 * @param environment Окружение (production, development, testing)
 */
export const initSentry = (
  dsn: string = import.meta.env.VITE_SENTRY_DSN, 
  environment: string = import.meta.env.MODE
) => {
  if (!dsn) {
    console.warn('Sentry DSN не указан. Мониторинг ошибок не будет работать.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // Настройка захвата ошибок
    // В продакшн-режиме отправляем 10% ошибок, в других режимах - все
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Данные о пользователе и контексте
    beforeSend(event) {
      // В продакшн-режиме удаляем IP и другие персональные данные
      if (environment === 'production' && event.user) {
        delete event.user.ip_address;
      }
      return event;
    },
    
    // Контекст для ошибок
    initialScope: {
      tags: {
        app: 'domgo',
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
      },
    },
  });
};

/**
 * Установка информации о пользователе для мониторинга
 * @param userId ID пользователя (без персональной информации)
 */
export const setUserContext = (userId: string) => {
  Sentry.setUser({ id: userId });
};

/**
 * Удаление информации о пользователе
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Захват и отправка ошибки в Sentry
 * @param error Объект ошибки
 * @param context Дополнительный контекст
 */
export const captureError = (error: Error, context: Record<string, any> = {}) => {
  Sentry.captureException(error, { extra: context });
};

/**
 * Отправка информационного сообщения в Sentry
 * @param message Сообщение
 * @param context Дополнительный контекст
 */
export const captureMessage = (message: string, context: Record<string, any> = {}) => {
  Sentry.captureMessage(message, { extra: context });
};



/**
 * HOC для компонентов с обработкой ошибок
 */
export const withErrorBoundary = Sentry.withErrorBoundary;

/**
 * Компонент для отображения обработки ошибок
 */
export const ErrorBoundary = Sentry.ErrorBoundary;
