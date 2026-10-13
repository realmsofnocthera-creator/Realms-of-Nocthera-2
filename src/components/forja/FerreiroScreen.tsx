'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Hammer, Shield, Sparkles, Swords } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';

const OPCOES = [
  { id: 'equipamentos', nome: 'Fabricar equipamentos', descricao: 'Forje armas a partir dos materiais dos monstros.', Icone: Swords, href: '/forja' as string | null },
  { id: 'armadura', nome: 'Melhorar armadura', descricao: 'Fabrique peças e suba o nível delas com orbes.', Icone: Shield, href: '/armaduras' },
  { id: 'cosmeticos', nome: 'Fabricar cosméticos', descricao: 'Em breve.', Icone: Sparkles, href: null },
];

/** Menu do Ferreiro: de onde se chega à Forja. Só "Fabricar equipamentos" existe por enquanto. */
export function FerreiroScreen({ character }: { character: CharacterDocument }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(48,28,14,0.92) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <Link href="/menu" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Menu
          </Link>
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{character.nome} · Nv. {character.nivel}</span>
        </header>
        <div className="flex flex-col items-center gap-1 py-2">
          <Hammer className="w-8 h-8" style={{ color: OURO }} />
          <h1 className="text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Ferreiro</h1>
          <p className="text-xs text-center" style={{ color: colors.text.secondary }}>O que você quer forjar hoje?</p>
        </div>
        <section aria-label="Opções do Ferreiro" className="flex flex-col gap-2.5">
          {OPCOES.map(({ id, nome, descricao, Icone, href }) => {
            const conteudo = (
              <>
                <span className="w-11 h-11 shrink-0 rounded-sm border flex items-center justify-center" style={{ borderColor: `${OURO}99`, backgroundColor: colors.background.primary }}>
                  <Icone className="w-6 h-6" style={{ color: href ? '#E6C775' : colors.text.secondary }} />
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-[15px] font-cinzel font-bold" style={{ color: href ? '#F5E3B3' : colors.text.secondary }}>{nome}</span>
                  <span className="text-[11px]" style={{ color: colors.text.secondary }}>{descricao}</span>
                </span>
              </>
            );
            const estilo = { backgroundColor: colors.background.secondary, borderColor: href ? OURO : `${colors.border.default}66`, opacity: href ? 1 : 0.6 };
            return href ? (
              <Link key={id} href={href} aria-label={nome} className="flex items-center gap-3 rounded-sm border-2 px-3 py-3 active:scale-[0.99] transition-transform" style={estilo}>{conteudo}</Link>
            ) : (
              <div key={id} aria-label={`${nome} (em breve)`} aria-disabled="true" className="flex items-center gap-3 rounded-sm border-2 px-3 py-3 cursor-not-allowed" style={estilo}>{conteudo}</div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
