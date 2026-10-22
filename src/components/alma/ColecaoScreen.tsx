'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { conjuntosCompletos } from '@/game/almas';
import { BONUS_DO_CONJUNTO_PERCENTUAL, NOME_DA_CATEGORIA, RARIDADES_DE_CARTA, textoDoEfeito, tiposDaRaridadeDeCarta, TIPOS_DE_CARTA, valorFixoDaRaridade } from '@/rules/almas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import type { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';

/** Coleção (7.8): todas as cartas do catálogo, as descobertas e as que faltam; completar o conjunto de uma raridade dá bônus. */
export function ColecaoScreen({ personagem }: { personagem: CharacterDocument }) {
  const { colors } = NOCTHERA_THEME;
  const descobertas = personagem.cartasDescobertas ?? [];
  const completos = conjuntosCompletos(descobertas);
  const bonusTotal = completos.reduce((s, r) => s + BONUS_DO_CONJUNTO_PERCENTUAL[r], 0);
  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Coleção</h1>
          <Link href="/alma" className="ml-auto text-xs underline" style={{ color: colors.text.secondary }}>Alma</Link>
        </header>
        <p className="text-sm">Descobertas: <strong>{descobertas.length}</strong> de {TIPOS_DE_CARTA.length} cartas · Bônus de coleção: <strong style={{ color: '#7BC47F' }}>+{bonusTotal}%</strong> de ATQ, DEF e HP</p>
        <p className="text-xs" style={{ color: colors.text.secondary }}>Descobrir todas as 9 cartas de uma raridade completa o conjunto e dá um bônus permanente (vale a partir do nível 25, mesmo se você destruir as cartas depois).</p>
        {RARIDADES_DE_CARTA.map((raridade) => {
          const def = EMBLEMA_RARIDADE_MAP[raridade];
          const tipos = tiposDaRaridadeDeCarta(raridade);
          const tenho = tipos.filter((t) => descobertas.includes(t.id)).length;
          const completo = completos.includes(raridade);
          return (
            <section key={raridade} aria-label={`Conjunto ${def.nome}`} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ borderColor: completo ? '#7BC47F' : OURO, backgroundColor: colors.background.secondary }}>
              <h2 className="font-cinzel font-bold text-base flex justify-between gap-2">
                <span style={{ color: def.cor }}>{def.nome}</span>
                <span className="text-xs font-normal" style={{ color: completo ? '#7BC47F' : colors.text.secondary }}>{tenho}/{tipos.length} · +{BONUS_DO_CONJUNTO_PERCENTUAL[raridade]}%{completo ? ' (ativo)' : ''}</span>
              </h2>
              <ul className="grid grid-cols-1 gap-1">
                {tipos.map((t) => {
                  const achou = descobertas.includes(t.id);
                  return (
                    <li key={t.id} className="rounded-sm border px-2 py-1 text-xs flex justify-between gap-2" style={{ borderColor: achou ? def.cor : '#4A3F2A', opacity: achou ? 1 : 0.55 }}>
                      <span>{achou ? t.nome : '???'} <span style={{ color: colors.text.secondary }}>· {NOME_DA_CATEGORIA[t.categoria]}</span></span>
                      <span style={{ color: colors.text.secondary }}>{achou ? textoDoEfeito(t.fixo, valorFixoDaRaridade(t.fixo, raridade)) : 'não descoberta'}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
