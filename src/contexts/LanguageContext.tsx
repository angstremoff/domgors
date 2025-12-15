import React, { createContext, useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';

type LanguageType = 'ru' | 'sr';

interface LanguageContextValue {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<LanguageType>('ru');

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('language');
        if (storedLanguage && (storedLanguage === 'ru' || storedLanguage === 'sr')) {
          setLanguageState(storedLanguage);
          i18n.changeLanguage(storedLanguage);
        }
      } catch (error) {
        Logger.error('Ошибка загрузки языка:', error);
      }
    };

    loadStoredLanguage();
  }, [i18n]);

  const setLanguage = async (lang: LanguageType) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('language', lang);
      i18n.changeLanguage(lang);
    } catch (error) {
      Logger.error('Ошибка сохранения языка:', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage должен использоваться внутри LanguageProvider');
  }
  return context;
};
