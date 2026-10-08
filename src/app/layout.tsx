import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { FirebaseInit } from '@/components/FirebaseInit';

const cinzel = localFont({
  src: [
    {
      path: '../assets/fonts/cinzel-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/cinzel-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/cinzel-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Realms of Nocthera',
  description: 'RPG online de dark fantasy - Base do projeto e regras do jogo.',
  openGraph: {
    title: 'Realms of Nocthera',
    description: 'RPG online de dark fantasy - Base do projeto e regras do jogo.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Realms of Nocthera',
    description: 'RPG online de dark fantasy - Base do projeto e regras do jogo.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cinzel.variable}>
      <body className="bg-[#0D0D0D] text-[#F5F3E0] min-h-screen antialiased selection:bg-[#ED8A0C]/30 selection:text-[#F5F3E0]">
        <FirebaseInit />
        {children}
      </body>
    </html>
  );
}

