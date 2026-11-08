'use client';

import React from 'react';
import { X } from 'lucide-react';
import { ICONES_DOS_SELOS } from '@/assets/buscarUi';
import { IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import {
  BUSCAS_PARA_GARANTIA,
  CHANCES_DO_SELO,
  NOME_DA_RARIDADE_DE_COLECIONAVEL,
  NOME_DO_SELO,
  RARIDADE_DO_SELO,
  SELOS_DE_BUSCA,
  SELOS_POR_BUSCA,
  type SeloDeBusca,
} from '@/rules/colecionaveis';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';

export const porcento = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** As chances e a garantia de cada selo, em um painel de pixel (o "?" da tela Buscar). */
export function InfoDaBusca({ seloInicial, aoFechar }: { seloInicial: SeloDeBusca; aoFechar: () => void }) {
  const [selo, setSelo] = React.useState<SeloDeBusca>(seloInicial);
  const garantida = RARIDADE_DO_SELO[selo];
  return (
    <div role="dialog" aria-modal="true" aria-label="Chances da busca" onClick={aoFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-3 py-4">
      <div onClick={(e) => e.stopPropagation()} className="caixa-pixel relative w-full max-w-[360px] max-h-[92dvh] overflow-y-auto p-3.5 flex flex-col gap-2.5">
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="pilula-pixel absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center cursor-pointer">
          <X className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
        </button>
        <h2 className="font-[family-name:var(--font-pixel)] text-[9px] leading-tight text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B] pr-10">CHANCES</h2>
        <p className="font-[family-name:var(--font-silk)] text-[11px] text-[#B2A66C] leading-snug">
          {SELOS_POR_BUSCA} selos por busca. A cada {BUSCAS_PARA_GARANTIA} buscas com o mesmo selo, a última dá um colecionável inteiro da raridade dele.
        </p>
        <div role="tablist" aria-label="Selo" className="grid grid-cols-4 gap-1">
          {SELOS_DE_BUSCA.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === selo}
              aria-label={NOME_DO_SELO[s]}
              onClick={() => setSelo(s)}
              className={`slot-kit flex items-center justify-center p-0.5 cursor-pointer ${s === selo ? 'brightness-125' : 'opacity-60'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ICONES_DOS_SELOS[s]} alt="" aria-hidden="true" className="w-full aspect-square object-contain" style={{ imageRendering: 'pixelated' }} />
            </button>
          ))}
        </div>
        <p className="font-cinzel font-bold text-sm text-[#F5E3B3] text-center">{NOME_DO_SELO[selo]}</p>
        <ul aria-label={`Chances com o ${NOME_DO_SELO[selo]}`} className="flex flex-col gap-1">
          {CHANCES_DO_SELO[selo].map((l) => (
            <li key={`${l.raridade}-${l.inteiro}`} className="pilula-pixel flex items-center gap-1.5 px-2 py-1">
              <IconeDeRaridade raridade={l.raridade} className="w-5 h-5" />
              <span className="font-[family-name:var(--font-silk)] text-[11px] flex-1" style={{ color: EMBLEMA_RARIDADE_MAP[l.raridade].cor }}>
                {NOME_DA_RARIDADE_DE_COLECIONAVEL[l.raridade]} · {l.inteiro ? 'inteiro' : 'fragmentos'}
              </span>
              <span className="font-[family-name:var(--font-silk)] text-[12px] font-bold text-[#F5F3E0] tabular-nums">{porcento(l.chance)}</span>
            </li>
          ))}
        </ul>
        <p className="flex items-center justify-center gap-1.5 font-[family-name:var(--font-silk)] text-[11px] text-[#F2C94C]">
          <IconeDeRaridade raridade={garantida} className="w-5 h-5" />
          Garantia: {NOME_DA_RARIDADE_DE_COLECIONAVEL[garantida]} inteiro
        </p>
      </div>
    </div>
  );
}
