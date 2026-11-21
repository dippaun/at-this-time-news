import './globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from '@/components/ui/client';

const gujarati = localFont({
  src: [
    { path: '../public/fonts/NotoSansGujarati-Regular.ttf', weight: '400' },
    { path: '../public/fonts/NotoSansGujarati-Bold.ttf', weight: '700' },
    { path: '../public/fonts/NotoSansGujarati-ExtraBold.ttf', weight: '800' },
  ],
  variable: '--font-gujarati',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'AT THIS TIME · Gujarat agri & industry news', template: '%s · AT THIS TIME' },
  description: 'Live Gujarat news: agriculture, APMC mandi rates, industry and Rajkot. Summarised by AI and turned into branded Instagram posts and reels.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1,
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#ffffff' }, { media: '(prefers-color-scheme: dark)', color: '#0d0f14' }],
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${gujarati.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
