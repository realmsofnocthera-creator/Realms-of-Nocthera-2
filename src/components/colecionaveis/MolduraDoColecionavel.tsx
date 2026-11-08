import React from 'react';
import { MOLDURAS_DOS_COLECIONAVEIS } from '@/assets/colecaoUi';
import { arteDoColecionavel } from '@/assets/colecionaveis';
import type { Colecionavel } from '@/rules/colecionaveis';

/** A arte do colecionável dentro da moldura da raridade; sem ativar, a arte fica em cinza escuro e a moldura mais fraca. */
export function MolduraDoColecionavel({ c, ativo, className = 'w-11 h-11' }: { c: Colecionavel; ativo: boolean; className?: string }) {
  const arte = arteDoColecionavel(c.id);
  return (
    <span className={`relative block shrink-0 ${className}`} aria-hidden="true">
      {arte && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={arte}
          alt=""
          className="absolute inset-[9%] w-[82%] h-[82%] object-contain"
          style={{ imageRendering: 'pixelated', ...(ativo ? {} : { filter: 'grayscale(1) brightness(0.4)', opacity: 0.85 }) }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MOLDURAS_DOS_COLECIONAVEIS[c.raridade]} alt="" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated', ...(ativo ? {} : { opacity: 0.55 }) }} />
    </span>
  );
}
