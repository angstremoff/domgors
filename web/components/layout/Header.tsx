'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe, User, Menu, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const currentTheme = theme || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ru' ? 'sr' : 'ru';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
            <Image src="/logo.png" alt="DomGo" width={40} height={40} className="h-10 w-10" />
            <span className="text-2xl font-bold text-primary">DomGo.rs</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/prodaja" className="text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.sale')}
            </Link>
            <Link href="/izdavanje" className="text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.rent')}
            </Link>
            <Link href="/novogradnja" className="text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.newBuildings')}
            </Link>
            <Link href="/agencije" className="text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.agencies')}
            </Link>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button onClick={toggleLanguage} className="flex items-center space-x-1 text-sm text-textSecondary hover:text-text transition-colors" aria-label={t('common.language')}>
              <Globe className="h-5 w-5" />
              <span className="hidden sm:inline">{i18n.language.toUpperCase()}</span>
            </button>

            <button onClick={toggleTheme} className="text-textSecondary hover:text-text transition-colors" aria-label={t('common.darkMode')}>
              {mounted ? (
                theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5" />
              )}
            </button>

            {user ? (
              <Link href="/profil" className="hidden sm:flex items-center space-x-2 text-sm font-medium text-text hover:text-primary transition-colors">
                <User className="h-5 w-5" />
                <span>{t('common.profile')}</span>
              </Link>
            ) : (
              <Link href="/prijava" className="hidden sm:block text-sm font-medium text-text hover:text-primary transition-colors">
                {t('common.login')}
              </Link>
            )}

            <button className="md:hidden text-text" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={t('common.openMenu')}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-4 space-y-3">
            <Link href="/prodaja" onClick={closeMobileMenu} className="block text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.sale')}
            </Link>
            <Link href="/izdavanje" onClick={closeMobileMenu} className="block text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.rent')}
            </Link>
            <Link href="/novogradnja" onClick={closeMobileMenu} className="block text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.newBuildings')}
            </Link>
            <Link href="/agencije" onClick={closeMobileMenu} className="block text-sm font-medium text-text hover:text-primary transition-colors">
              {t('common.agencies')}
            </Link>
            <div className="border-t border-border pt-3">
              {user ? (
                <Link href="/profil" onClick={closeMobileMenu} className="flex items-center space-x-2 text-sm font-medium text-text hover:text-primary transition-colors">
                  <User className="h-5 w-5" />
                  <span>{t('common.profile')}</span>
                </Link>
              ) : (
                <Link href="/prijava" onClick={closeMobileMenu} className="block text-sm font-medium text-text hover:text-primary transition-colors">
                  {t('common.login')}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
