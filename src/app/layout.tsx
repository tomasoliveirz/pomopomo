import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'POMOPOMO - Focus Together',
  description: 'A clean, theme-able, privacy-first Pomodoro web app for solo or group focus sessions',
  keywords: 'pomodoro, focus, productivity, timer, group study',
  authors: [{ name: 'POMOPOMO' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
        <link rel="icon" href="/tomato.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/tomato.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fredoka+One&display=swap"
          rel="stylesheet"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1657008186985321"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.variable} data-theme="midnight_bloom">
        {children}
      </body>
    </html>
  );
}


