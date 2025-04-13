import React, { ReactNode, useEffect } from 'react';
import SEOProvider from '../providers/SEOProvider';
import { initSentry } from '../services/sentryService';

// Инициализация Sentry при старте приложения
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  initSentry(sentryDsn);
}

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Компонент-обертка для всех провайдеров приложения
 * Подключает SEO и другие глобальные сервисы
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  useEffect(() => {
    // Глобальный обработчик ошибок
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Глобальная ошибка:', event.error);
      // Ошибка уже будет автоматически отправлена в Sentry
      // Можно добавить дополнительную логику обработки
    };

    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  return (
    <SEOProvider>
      {children}
    </SEOProvider>
  );
};

export default AppProviders;
