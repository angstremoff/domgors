import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DomGo Admin',
  description: 'Admin panel for DomGo',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
      </head>
      <body className="min-h-screen bg-gray-100">{children}</body>
    </html>
  );
}
