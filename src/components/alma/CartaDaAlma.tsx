'use client';

import React from 'react';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOME_DA_CATEGORIA, TIPO_DE_CARTA_MAP, textoDoEfeito, valorFixoDaCarta, type CartaItem } from '@/rules/almas';

const ROMANOS = ['', 'I', 'II', 'III'];

/** O nome, a raridade, o despertar e os efeitos de uma carta (o fixo e os aleatórios). */
export function CartaDaAlma({ carta, children, destaque = false }: { carta: CartaItem; children?: React.ReactNode; destaque?: boolean }) {
  const tipo = TIPO_DE_CARTA_MAP[carta.tipo];
  const raridade = EMBLEMA_RARIDADE_MAP[tipo.raridade];
  return (
    <div className="rounded-sm border-2 px-2 py-1.5 flex flex-col gap-0.5" style={{ borderColor: raridade.cor, backgroundColor: destaque ? '#2A2214' : 'rgba(13,13,13,0.7)' }}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-cinzel font-bold text-[13px] leading-tight" style={{ color: raridade.cor }}>{tipo.nome}</span>
        <span className="text-[10px] uppercase tracking-wide shrink-0" style={{ color: '#D5C7A4' }}>
          {raridade.nome}{carta.despertar > 0 ? ` · Despertar ${ROMANOS[carta.despertar]}` : ''}
        </span>
      </span>
      <span className="text-[11px]" style={{ color: '#F5E3B3' }}>{textoDoEfeito(tipo.fixo, valorFixoDaCarta(carta))} <span style={{ color: '#8d8574' }}>(fixo)</span></span>
      {carta.efeitos.map((e, i) => (
        <span key={i} className="text-[11px]" style={{ color: '#D5C7A4' }}>{textoDoEfeito(e.efeito, e.valor)}</span>
      ))}
      {children}
    </div>
  );
}

export const nomeDaCategoria = (c: CartaItem) => NOME_DA_CATEGORIA[TIPO_DE_CARTA_MAP[c.tipo].categoria];
