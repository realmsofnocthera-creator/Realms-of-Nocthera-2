import React from 'react';
import { BookOpen, Shield, Slice, Sword, WandSparkles } from 'lucide-react';
import type { CategoriaArma } from '@/rules/armas';

function Lanca({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M4 20 17 7" />
      <path d="M14 4h6v6l-3-1-2-2z" />
    </svg>
  );
}

/** Ícone da categoria (provisório: a arte das armas entra depois). */
export function IconeCategoria({ categoria, className, style }: { categoria: CategoriaArma; className?: string; style?: React.CSSProperties }) {
  const props = { className, style, 'aria-hidden': true as const };
  switch (categoria) {
    case 'espadaGrande': return <Sword {...props} />;
    case 'katana': return <Slice {...props} />;
    case 'lanca': return <Lanca className={className} style={style} />;
    case 'espadaEscudo': return <Shield {...props} />;
    case 'grimorio': return <BookOpen {...props} />;
    case 'cajado': return <WandSparkles {...props} />;
  }
}

/** A cor do brilho de cada raridade de arma (slots, raios e clarões). */
export const BRILHO_DA_ARMA = { comum: '#C3CAD6', raro: '#5FD37A', muitoRaro: '#4DA3FF', epico: '#B26BFF', lendario: '#FFC83D', mitico: '#FF4B4B' } as const;
