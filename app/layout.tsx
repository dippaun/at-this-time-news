import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Gujarat News Studio — live Gujarat agri & industry news to social posts',
  description: 'Fetch live Gujarat news every 5 minutes, summarise with AI, render branded frames, approve and publish.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c2410c' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
