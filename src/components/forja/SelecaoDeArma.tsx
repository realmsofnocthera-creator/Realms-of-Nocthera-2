'use client';

import React from 'react';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import type { ArmaPersonagem } from '@/game/forja';
import { CATEGORIAS_ARMA, type CategoriaArma } from '@/rules/armas';
import { IconeCategoria } from './IconeDeCategoria';
import { AZUL_CLARO, TEXTO_PIXEL } from './KitDaForja';

/**
 * A escolha da arma: uma grade com as 6 categorias (cada uma numa caixa do kit). O número no canto é quantas armas
 * dessa categoria o personagem já tem. Tocar abre a árvore da categoria.
 */
export function SelecaoDeArma({ armas, aoEscolher }: { armas: readonly ArmaPersonagem[] | undefined; aoEscolher: (c: CategoriaArma) => void }) {
  const minhas = armas ?? [];
  return (
    <ul aria-label="Categorias de arma" className="grid grid-cols-2 gap-x-3 gap-y-4">
      {CATEGORIAS_ARMA.map((c) => {
        const n = minhas.filter((a) => a.categoria === c.id).length;
        return (
          <li key={c.id}>
            <button type="button" onClick={() => aoEscolher(c.id)} aria-label={`${c.nome}${n ? `, você tem ${n}` : ''}`} className="relative block w-full cursor-pointer active:translate-y-px group">
              <span className="relative block w-full" style={{ aspectRatio: '228 / 143' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={KIT_DA_FORJA.caixaArte} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full group-active:brightness-125" style={{ imageRendering: 'pixelated' }} />
                <span className="absolute inset-0 flex items-center justify-center">
                  <IconeCategoria categoria={c.id} className="w-12 h-12 drop-shadow-[0_0_6px_rgba(111,227,238,0.7)]" style={{ color: AZUL_CLARO }} />
                </span>
                {n > 0 && <span className={`absolute top-1.5 right-2 bg-[#0B0F1A] border border-[#E7C46A] px-1.5 py-0.5 ${TEXTO_PIXEL} text-[10px] leading-none font-bold text-[#E7C46A]`}>×{n}</span>}
              </span>
              <span className="block mt-1 font-cinzel font-extrabold uppercase text-[12px] leading-tight text-center text-[#DFF3FF] [text-shadow:1px_1px_0_#05070D]">{c.nome}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
