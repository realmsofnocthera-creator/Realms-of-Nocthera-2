'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ColecaoDaAlma } from '@/components/alma/ColecaoDaAlma';
import { ColecionaveisPainel } from '@/components/colecionaveis/ColecionaveisPainel';
import type { Token } from '@/components/colecionaveis/api';
import type { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';
type Aba = 'colecionaveis' | 'alma';

/** O card Coleção do Menu: a aba Colecionáveis (os da roleta do Buscar) e a das cartas da Alma. */
export function ColecaoScreen({ personagem, tokenFresco }: { personagem: CharacterDocument; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [aba, setAba] = useState<Aba>('colecionaveis');

  // A tela da Alma abre direto na aba das cartas (/colecao?aba=alma)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('aba') === 'alma') setAba('alma');
  }, []);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Coleção</h1>
          <Link href="/buscar" className="ml-auto text-xs underline" style={{ color: colors.text.secondary }}>Buscar</Link>
        </header>
        <div role="tablist" aria-label="Coleção" className="grid grid-cols-2 gap-1.5">
          {(
            [
              ['colecionaveis', 'Colecionáveis'],
              ['alma', 'Cartas da Alma'],
            ] as const
          ).map(([id, nome]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={aba === id}
              onClick={() => setAba(id)}
              className="rounded-sm border px-1.5 py-1.5 text-sm font-bold"
              style={{ borderColor: OURO, backgroundColor: aba === id ? '#5A4824' : '#3A2F18', color: '#F5E3B3' }}
            >
              {nome}
            </button>
          ))}
        </div>
        {aba === 'colecionaveis' ? <ColecionaveisPainel tokenFresco={tokenFresco} /> : <ColecaoDaAlma personagem={personagem} />}
      </div>
    </main>
  );
}
