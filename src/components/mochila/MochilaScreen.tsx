'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { itensDoInventario } from '@/lib/cacadaTela';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';

/** Mochila: os materiais do inventário (drops da Caçada), do mais raro para o mais comum. */
export function MochilaScreen({ character }: { character: CharacterDocument }) {
  const { colors } = NOCTHERA_THEME;
  const itens = itensDoInventario(character.inventario);
  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <Link href="/menu" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Menu
          </Link>
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{character.nome} · Nv. {character.nivel}</span>
        </header>
        <h1 className="text-center text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Mochila</h1>
        {itens.length === 0 ? (
          <div className="rounded-sm border-2 p-6 flex flex-col items-center gap-2 text-center" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>
            <Package className="w-8 h-8" style={{ color: OURO }} />
            <span className="text-sm" style={{ color: colors.text.secondary }}>Sua mochila está vazia. Os materiais caem dos monstros da Caçada.</span>
            <Link href="/cacada" className="mt-1 px-3 py-1.5 rounded font-cinzel font-bold text-xs" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>Ir caçar</Link>
          </div>
        ) : (
          <section aria-label="Materiais" className="grid grid-cols-2 gap-2">
            {itens.map((i) => (
              <div key={i.id} className="rounded-sm border-2 px-2 py-1.5 flex flex-col" style={{ backgroundColor: colors.background.secondary, borderColor: `${i.cor}99` }}>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[12px] font-semibold leading-tight" style={{ color: i.cor }}>{i.nome}</span>
                  <span className="text-[13px] font-cinzel font-black" style={{ color: colors.text.primary }}>×{i.quantidade}</span>
                </div>
                <span className="text-[10px]" style={{ color: colors.text.secondary }}>{i.raridadeNome} · {i.estrelaOrigem}★</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
