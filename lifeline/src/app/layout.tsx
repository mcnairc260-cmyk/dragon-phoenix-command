import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

const site = process.env.APP_URL ?? 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Lifeline — Your silence shouldn’t go unnoticed', template: '%s · Lifeline' },
  description: 'Lifeline is a scheduled check-in service. If you miss a check-in, the people you chose are told. Your Lifeline. Your Rules. Your Peace of Mind.',
  openGraph: { title: 'Lifeline', description: 'If something happened to you, how long would it take someone to notice?', type: 'website', siteName: 'Lifeline' },
  twitter: { card: 'summary' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: '#0a111f', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN; // cookieless analytics; off unless configured
  return (
    <html lang="en">
      <body>
        {children}
        {plausible && <Script defer data-domain={plausible} src="https://plausible.io/js/script.js" strategy="afterInteractive" />}
      </body>
    </html>
  );
}
