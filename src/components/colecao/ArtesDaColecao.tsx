import React from 'react';
import { BANNER_DA_COLECAO, ICONES_DAS_MOEDAS, ICONES_DE_RARIDADE, type MoedaDaColecao } from '@/assets/colecaoUi';
import type { EmblemaRaridade } from '@/rules/emblemas';

/** O ícone de uma moeda da Coleção (decorativo: o nome e o número vêm em texto ao lado). */
export function IconeDeMoeda({ moeda, className = 'w-4 h-4' }: { moeda: MoedaDaColecao; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={ICONES_DAS_MOEDAS[moeda]} alt="" aria-hidden="true" className={`inline-block object-contain align-middle ${className}`} style={{ imageRendering: 'pixelated' }} />;
}

/** O ícone de uma raridade (decorativo: o nome da raridade vem em texto ao lado). */
export function IconeDeRaridade({ raridade, className = 'w-4 h-4' }: { raridade: EmblemaRaridade; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={ICONES_DE_RARIDADE[raridade]} alt="" aria-hidden="true" className={`inline-block object-contain align-middle ${className}`} style={{ imageRendering: 'pixelated' }} />;
}

/** O banner do topo das listas da Coleção, com o título no painel escuro do meio. */
export function BannerDaLista({ titulo }: { titulo: string }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: '900 / 382' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BANNER_DA_COLECAO} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />
      <h1
        className="absolute flex items-center justify-center text-center font-cinzel font-extrabold uppercase tracking-widest leading-tight text-[#F5E3B3] text-[clamp(14px,5vw,26px)] [text-shadow:2px_2px_0_#1A120B]"
        style={{ left: '10%', width: '80%', top: '27%', height: '40%' }}
      >
        {titulo}
      </h1>
    </div>
  );
}
