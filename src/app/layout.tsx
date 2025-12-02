import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'POMOPOMO - Focus Together',
  description: 'A clean, theme-able, privacy-first Pomodoro web app for solo or group focus sessions',
  keywords: 'pomodoro, focus, productivity, timer, group study',
  authors: [{ name: 'POMOPOMO' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#818cf8',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/branding/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/branding/logo.svg" />
      </head>
      <body className={`${nunito.variable} font-sans`} data-theme="midnight_bloom">
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="adsbygoogle-init"
            strategy="afterInteractive"
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1657008186985321"
            crossOrigin="anonymous"
          />
        )}
        {children}
      </body>
    </html>
  );
}


