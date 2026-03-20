import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { I18nProvider } from '@/providers/I18nProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Analytics } from '@/components/Analytics';
import '@/styles/globals.css';
import 'leaflet/dist/leaflet.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

const SITE_URL = 'https://domgo.rs';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'DomGo.rs - Nekretnine u Srbiji | Недвижимость в Сербии',
    template: '%s | DomGo.rs',
  },
  description: 'Pretraga i prodaja nekretnina u Srbiji: stanovi, kuće, poslovni prostori. Аренда и продажа домов, квартир и коммерческой недвижимости в Сербии.',
  keywords: [
    // Сербские ключевые слова
    'nekretnine', 'Srbija', 'stanovi', 'kuće', 'zakup', 'prodaja',
    'nekretnine beograd', 'stan na prodaju', 'kuća na prodaju',
    'izdavanje stanova', 'poslovni prostor', 'novogradnja',
    // Русские ключевые слова
    'недвижимость', 'Сербия', 'квартиры', 'дома', 'аренда', 'продажа',
    'недвижимость белград', 'квартира на продажу', 'дом в сербии',
    'аренда квартир', 'коммерческая недвижимость', 'новостройки',
  ],
  authors: [{ name: 'DomGo.rs' }],
  creator: 'DomGo.rs',
  publisher: 'DomGo.rs',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    alternateLocale: ['ru_RU'],
    url: SITE_URL,
    siteName: 'DomGo.rs',
    title: 'DomGo.rs - Nekretnine u Srbiji | Недвижимость в Сербии',
    description: 'Pretraga i prodaja nekretnina u Srbiji. Аренда и продажа недвижимости в Сербии.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'DomGo.rs Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DomGo.rs - Nekretnine u Srbiji',
    description: 'Pretraga i prodaja nekretnina u Srbiji. Аренда и продажа недвижимости в Сербии.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    languages: {
      'sr-RS': SITE_URL,
      'ru-RU': `${SITE_URL}?lang=ru`,
    },
  },
  verification: {
    google: 'google543a84de6483d7b7',
    yandex: '5d2c280f46e86563',
  },
  category: 'real estate',
};

// JSON-LD структурированные данные для организации
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'RealEstateAgent',
  name: 'DomGo.rs',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'Платформа для поиска недвижимости в Сербии. Prodaja i izdavanje nekretnina u Srbiji.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'RS',
  },
  areaServed: {
    '@type': 'Country',
    name: 'Serbia',
  },
  sameAs: [
    'https://www.rustore.ru/catalog/app/domgo.rs',
  ],
};

// JSON-LD для веб-сайта
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'DomGo.rs',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/prodaja?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://mc.yandex.ru" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Analytics />
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
