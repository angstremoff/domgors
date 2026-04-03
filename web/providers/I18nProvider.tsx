'use client';

import { useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import ru from '@shared/translations/ru.json';
import sr from '@shared/translations/sr.json';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      ru: { translation: ru },
      sr: { translation: sr },
    },
    lng: 'sr',
    fallbackLng: 'sr',
    interpolation: {
      escapeValue: false,
    },
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'sr')) {
      i18n.changeLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
    } else {
      document.documentElement.lang = i18n.language;
    }
  }, []);

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      document.documentElement.lang = lng;
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <div style={{ display: 'contents' }} suppressHydrationWarning>{children}</div>
    </I18nextProvider>
  );
}
