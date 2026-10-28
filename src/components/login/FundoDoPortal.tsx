import React from 'react';
import { Brasas } from '@/components/landing/Brasas';

/** Fundo do portal (login e criação do personagem): a arte da lua vermelha, escurecida, com brasas por cima. */
export function FundoDoPortal() {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden bg-[#0D0D0D] pointer-events-none">
      <picture>
        <source srcSet="/images/portal-fundo.avif" type="image/avif" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/portal-fundo.webp" alt="" draggable={false} className="w-full h-full object-cover object-[28%_center] select-none" />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D]/60 via-[#120F0C]/55 to-[#0D0D0D]/85" />
      <Brasas />
    </div>
  );
}
