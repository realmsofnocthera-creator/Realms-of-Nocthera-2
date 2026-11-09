import React from 'react';
import type { CategoriaArma } from '@/rules/armas';
import { ICONE_DA_CATEGORIA } from '@/assets/forjaItens';
import { arteDaArma } from '@/assets/armasCriatura';

/** A arte da categoria da arma; `style.color` vira o brilho quando o chamador pede `filter`. */
export function IconeCategoria({ categoria, baseId, className, style }: { categoria: CategoriaArma; baseId?: string; className?: string; style?: React.CSSProperties }) {
  const { color: _cor, ...resto } = style ?? {};
  void _cor;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={arteDaArma(baseId, categoria) ?? ICONE_DA_CATEGORIA[categoria]} alt="" aria-hidden="true" draggable={false} className={`${className ?? ''} object-contain`} style={{ ...resto, imageRendering: 'auto' }} />
  );
}

/** A cor do brilho de cada raridade de arma (slots, raios e clarões). */
export const BRILHO_DA_ARMA = { comum: '#C3CAD6', raro: '#5FD37A', muitoRaro: '#4DA3FF', epico: '#B26BFF', lendario: '#FFC83D', mitico: '#FF4B4B' } as const;
