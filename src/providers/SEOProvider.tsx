import React, { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';

interface SEOProviderProps {
  children: ReactNode;
}

/**
 * Провайдер для SEO компонентов
 * Обертывает приложение в HelmetProvider для управления мета-тегами
 */
const SEOProvider: React.FC<SEOProviderProps> = ({ children }) => {
  return (
    <HelmetProvider>
      {children}
    </HelmetProvider>
  );
};

export default SEOProvider;
