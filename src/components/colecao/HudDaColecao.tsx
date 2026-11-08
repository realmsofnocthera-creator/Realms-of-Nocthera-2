'use client';

import React, { useEffect, useState } from 'react';
import { type MoedaDaColecao } from '@/assets/colecaoUi';
import { formatarCompacto, formatarTotal } from '@/rules/numerosCompactos';
import { IconeDeMoeda } from './ArtesDaColecao';

export interface SaldosDaColecao {
  fragmentos: number;
  pedras: number;
  poeira: number;
  cacos: number;
}

const MOEDAS: readonly { id: MoedaDaColecao; nome: string }[] = [
  { id: 'fragmento', nome: 'Fragmentos de Memória' },
  { id: 'pedra', nome: 'Pedras da Recordação' },
  { id: 'poeira', nome: 'Poeira de Alma' },
  { id: 'cacos', nome: 'Cacos de Alma' },
];

/**
 * A HUD das telas da Coleção: as quatro moedas da Coleção em pílulas de pixel, como o Ouro e os Diamantes do Hub
 * (valor abreviado em K, M e B; o toque mostra o total por alguns segundos).
 */
export function HudDaColecao({ saldos }: { saldos: SaldosDaColecao }) {
  const [aberta, setAberta] = useState<MoedaDaColecao | null>(null);
  useEffect(() => {
    if (!aberta) return;
    const t = setTimeout(() => setAberta(null), 3000);
    return () => clearTimeout(t);
  }, [aberta]);
  const valor = (id: MoedaDaColecao) => saldos[id === 'fragmento' ? 'fragmentos' : id === 'pedra' ? 'pedras' : id];
  return (
    <div role="group" aria-label="Moedas da Coleção" className="flex items-center justify-center gap-1.5 sm:gap-2">
      {MOEDAS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setAberta((a) => (a === m.id ? null : m.id))}
          aria-label={`${m.nome}: ${formatarTotal(valor(m.id))}`}
          title={m.nome}
          className="pilula-pixel relative flex items-center gap-1 pl-1 pr-1.5 sm:pr-2 py-0.5 tabular-nums cursor-pointer"
        >
          <IconeDeMoeda moeda={m.id} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <span className="font-[family-name:var(--font-silk)] text-[11px] sm:text-[13px] font-bold text-[#F5F3E0] [text-shadow:1px_1px_0_#1A120B]">{formatarCompacto(valor(m.id))}</span>
          {aberta === m.id && (
            <span role="status" className="caixa-pixel absolute left-1/2 -translate-x-1/2 top-full z-40 mt-2 whitespace-nowrap px-2 py-1 text-[11px] text-[#F5F3E0]">
              {m.nome} {formatarTotal(valor(m.id))}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
