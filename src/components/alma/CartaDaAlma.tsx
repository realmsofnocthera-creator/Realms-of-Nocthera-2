'use client';

import React, { useState } from 'react';
import { IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import { MiniaturaDaCarta, VisualizadorDaCarta } from './ArteDaCarta';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOME_DA_CATEGORIA, TIPO_DE_CARTA_MAP, textoDoEfeito, valorFixoDaCarta, type CartaItem } from '@/rules/almas';

const ROMANOS = ['', 'I', 'II', 'III'];

/** O nome, a raridade, o despertar e os efeitos de uma carta (o fixo e os aleatórios). */
export function CartaDaAlma({ carta, children, destaque = false }: { carta: CartaItem; children?: React.ReactNode; destaque?: boolean }) {
  const tipo = TIPO_DE_CARTA_MAP[carta.tipo];
  const raridade = EMBLEMA_RARIDADE_MAP[tipo.raridade];
  const [aberta, setAberta] = useState(false);
  return (
    <div className="rounded-sm border-2 px-2 py-1.5 flex gap-2" style={{ borderColor: raridade.cor, backgroundColor: destaque ? '#2A2214' : 'rgba(13,13,13,0.7)' }}>
      <MiniaturaDaCarta tipoId={carta.tipo} nome={tipo.nome} className="w-11 h-[61px] object-contain" aoAbrir={() => setAberta(true)} />
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="font-cinzel font-bold text-[13px] leading-tight" style={{ color: raridade.cor }}>{tipo.nome}</span>
          <span className="text-[10px] uppercase tracking-wide shrink-0 flex items-center gap-1" style={{ color: '#D5C7A4' }}>
            <IconeDeRaridade raridade={tipo.raridade} className="w-3.5 h-3.5" />
            {raridade.nome}{carta.despertar > 0 ? ` · Despertar ${ROMANOS[carta.despertar]}` : ''}
          </span>
        </span>
        <span className="text-[11px]" style={{ color: '#F5E3B3' }}>{textoDoEfeito(tipo.fixo, valorFixoDaCarta(carta))} <span style={{ color: '#8d8574' }}>(fixo)</span></span>
        {carta.efeitos.map((e, i) => (
          <span key={i} className="text-[11px]" style={{ color: '#D5C7A4' }}>{textoDoEfeito(e.efeito, e.valor)}</span>
        ))}
        {children}
      </div>
      {aberta && <VisualizadorDaCarta tipoId={carta.tipo} carta={carta} aoFechar={() => setAberta(false)} />}
    </div>
  );
}

export const nomeDaCategoria = (c: CartaItem) => NOME_DA_CATEGORIA[TIPO_DE_CARTA_MAP[c.tipo].categoria];
