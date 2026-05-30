'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface" itemScope itemType="https://schema.org/WPFooter">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* О нас */}
          <div>
            <h3 className="text-lg font-semibold text-text mb-4">DomGo.rs</h3>
            <p className="text-sm text-textSecondary">
              {t('footer.aboutLine', 'Platforma za pretragu nekretnina u Srbiji.')}
            </p>
          </div>

          {/* Разделы */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-4">{t('common.allListings')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/prodaja" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('common.sale')}
                </Link>
              </li>
              <li>
                <Link href="/izdavanje" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('common.rent')}
                </Link>
              </li>
              <li>
                <Link href="/novogradnja" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('common.newBuildings')}
                </Link>
              </li>
              <li>
                <Link href="/agencije" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('common.agencies')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Информация */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-4">{t('common.info')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/profil" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('common.profile')}
                </Link>
              </li>
              <li>
                <Link href="/prijava" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('common.login')}
                </Link>
              </li>
              <li>
                <Link href="/registracija" className="text-sm text-textSecondary hover:text-primary transition-colors">
                  {t('auth.register')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакт */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-4">{t('settings.contactUs')}</h3>
            <p className="text-sm text-textSecondary mb-2">
              Telegram: @Angstremoff
            </p>
            <p className="text-sm text-textSecondary">
              Email: admin@domgo.rs
            </p>
          </div>
        </div>

        {/* Копирайт и дополнительная SEO-информация */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-textSecondary">
              © {currentYear} DomGo.rs — {t('footer.allRights', 'Sva prava zadržana')}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.rustore.ru/catalog/app/domgo.rs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl transition-transform hover:scale-[1.02]"
                aria-label="RuStore"
              >
                <Image
                  src="/badges/rustore-badge.svg"
                  alt="RuStore"
                  width={172}
                  height={52}
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=domgo.rs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl transition-transform hover:scale-[1.02]"
                aria-label="Google Play"
              >
                <Image
                  src="/badges/google-play-badge.svg"
                  alt="Google Play"
                  width={172}
                  height={52}
                />
              </a>
              <span className="text-sm text-textSecondary">
                Srbija 🇷🇸
              </span>
            </div>
          </div>
          {/* SEO-текст для поисковиков */}
          <p className="mt-4 text-xs text-textSecondary/60 text-center max-w-3xl mx-auto">
            {t('footer.seoLine', 'DomGo.rs — nekretnine u Srbiji: kupovina i iznajmljivanje stanova i kuća.')}
          </p>
        </div>
      </div>
    </footer>
  );
}
