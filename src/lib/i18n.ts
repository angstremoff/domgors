import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '../translations/ru.json';
import sr from '../translations/sr.json';

const savedLanguage = localStorage.getItem('i18nextLng') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: {
        translation: ru
      },
      sr: {
        translation: sr
      }
    },
    lng: savedLanguage,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};

export default i18n;