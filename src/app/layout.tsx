import type { Metadata } from 'next';
import { Inter, Open_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const openSans = Open_Sans({
  variable: '--font-google-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PENGUIN TRACE — Web3 File Provenance & Cryptographic Verification',
  description:
    'Deterministic cryptographic file-provenance, release DNA tracking, and zero-trust risk intelligence platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${openSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="bg-[#070708] text-[#E5E2E3] font-sans min-h-screen antialiased selection:bg-[#5E6BFF]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
