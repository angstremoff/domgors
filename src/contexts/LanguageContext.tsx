import { createContext, useContext, useState, ReactNode } from 'react'
import i18n from '../lib/i18n'
import { useTranslation } from 'react-i18next'

type Language = 'ru' | 'sr'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('i18nextLng') as Language) || 'ru')
  const { t } = useTranslation()

  const handleLanguageChange = async (lang: Language) => {
    try {
      console.log(`Changing language to: ${lang}`)
      await i18n.changeLanguage(lang)
      setLanguage(lang)
      console.log(`Language successfully changed to: ${lang}`)
    } catch (error) {
      console.error(`Error changing language to ${lang}:`, error)
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}