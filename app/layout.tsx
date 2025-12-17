import type { Metadata } from 'next';
import './globals.css';
import './grizzley.css';

export const metadata: Metadata = {
  title: 'SSB Statistics',
  description: 'Watch the community play live on Kick',
  icons: {
    icon: '/ssb_logo.png',
  },
};

import GlobalChat from '../components/GlobalChat';

// ... (Metadata stays same)

import AnalyticsProvider from '../components/AnalyticsProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bungee&family=Ubuntu:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <AnalyticsProvider>
          <div id="__next">{children}</div>
          <GlobalChat />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
