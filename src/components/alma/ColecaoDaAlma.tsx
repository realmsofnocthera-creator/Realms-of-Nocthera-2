'use client';

import React, { useState } from 'react';
import { conjuntosCompletos } from '@/game/almas';
import { IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import { BONUS_DO_CONJUNTO_PERCENTUAL, RARIDADES_DE_CARTA, tiposDaRaridadeDeCarta, TIPOS_DE_CARTA } from '@/rules/almas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import type { CharacterDocument } from '@/server/characterService';
import { ArteDaCarta, VisualizadorDaCarta } from './ArteDaCarta';

/**
 * As cartas da Alma na Coleção (7.8), em pixel: o resumo, e em cada raridade uma grade de cartas. Descobertas
 * aparecem coloridas e abrem o visualizador; as que faltam ficam em cinza escuro. Completar o conjunto de uma
 * raridade dá um bônus permanente.
 */
export function ColecaoDaAlma({ personagem }: { personagem: CharacterDocument }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const descobertas = personagem.cartasDescobertas ?? [];
  const completos = conjuntosCompletos(descobertas);
  const bonusTotal = completos.reduce((s, r) => s + BONUS_DO_CONJUNTO_PERCENTUAL[r], 0);
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Resumo das cartas da Alma" className="caixa-pixel relative flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="font-[family-name:var(--font-pixel)] text-[8px] leading-tight text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
          DESCOBERTAS
          <span className="block mt-1.5 text-[12px] text-[#ED8A0C] tabular-nums">{descobertas.length}/{TIPOS_DE_CARTA.length}</span>
        </p>
        <p title="Bônus de coleção em ATQ, DEF e HP" aria-label={`Bônus de coleção: ${bonusTotal}% de ATQ, DEF e HP`} className="pilula-pixel px-2.5 py-1 font-[family-name:var(--font-silk)] text-[12px] font-bold text-[#7BC47F] tabular-nums">
          +{bonusTotal}%
        </p>
      </section>

      {RARIDADES_DE_CARTA.map((raridade) => {
        const def = EMBLEMA_RARIDADE_MAP[raridade];
        const tipos = tiposDaRaridadeDeCarta(raridade);
        const tenho = tipos.filter((t) => descobertas.includes(t.id)).length;
        const completo = completos.includes(raridade);
        return (
          <section key={raridade} aria-label={`Conjunto ${def.nome}`} className="flex flex-col gap-2">
            <h2 className="pilula-pixel self-start flex items-center gap-1.5 pl-1 pr-2.5 py-0.5">
              <IconeDeRaridade raridade={raridade} className="w-6 h-6" />
              <span className="font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase [text-shadow:1px_1px_0_#1A120B]" style={{ color: def.cor }}>{def.nome}</span>
              <span className="font-[family-name:var(--font-silk)] text-[11px] tabular-nums" style={{ color: completo ? '#7BC47F' : '#E2D6B6' }}>
                {tenho}/{tipos.length} · +{BONUS_DO_CONJUNTO_PERCENTUAL[raridade]}%{completo ? ' ✓' : ''}
              </span>
            </h2>
            <ul className="grid grid-cols-3 gap-2.5">
              {tipos.map((t) => {
                const achou = descobertas.includes(t.id);
                const carta = (
                  <span className="relative block w-full" style={{ aspectRatio: '216 / 300' }}>
                    <ArteDaCarta tipoId={t.id} className="w-full h-full" style={achou ? undefined : { filter: 'grayscale(1) brightness(0.4)', opacity: 0.85 }} />
                  </span>
                );
                return (
                  <li key={t.id} className="flex flex-col items-center gap-1">
                    {achou ? (
                      <button type="button" onClick={() => setAberta(t.id)} aria-label={`Ver a carta ${t.nome}`} className="w-full cursor-pointer p-0 border-0 bg-transparent active:translate-y-px">
                        {carta}
                      </button>
                    ) : (
                      <div aria-label="Carta ainda não descoberta" role="img" className="w-full">{carta}</div>
                    )}
                    <span className="font-cinzel font-bold text-[10px] leading-tight text-center min-h-[2.4em]" style={{ color: achou ? def.cor : '#6D6552' }}>{achou ? t.nome : '???'}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {aberta && <VisualizadorDaCarta tipoId={aberta} aoFechar={() => setAberta(null)} />}
    </div>
  );
}
