'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, X } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import {
  CATEGORIAS_MOCHILA,
  detalheDoItem,
  itensDaMochila,
  resumoDosEmblemas,
  saldosDaMochila,
  type CategoriaMochila,
} from '@/lib/mochilaTela';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';

/** Mochila: saldos, resumo dos emblemas e os itens do inventário em abas (monstros, mundo, orbes e especiais). */
export function MochilaScreen({ character }: { character: CharacterDocument }) {
  const { colors } = NOCTHERA_THEME;
  const abas = useMemo(() => itensDaMochila(character.inventario), [character.inventario]);
  const [aba, setAba] = useState<CategoriaMochila>('monstros');
  const [aberto, setAberto] = useState<string | null>(null);
  const itens = abas[aba];
  const categoria = CATEGORIAS_MOCHILA.find((c) => c.id === aba)!;
  const detalhe = aberto ? detalheDoItem(aberto) : null;
  const emblemas = resumoDosEmblemas(character);
  const vazia = CATEGORIAS_MOCHILA.every((c) => abas[c.id].length === 0);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null);
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberto]);

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

        <section aria-label="Saldos" className="grid grid-cols-3 gap-1.5">
          {saldosDaMochila(character).map((s) => (
            <div key={s.id} className="rounded-sm border px-2 py-1 flex flex-col" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}66` }}>
              <span className="text-[9px] leading-tight" style={{ color: colors.text.secondary }}>{s.rotulo}</span>
              <span className="text-[13px] font-cinzel font-black" style={{ color: '#F5E3B3' }}>{s.valor}</span>
            </div>
          ))}
        </section>

        <section aria-label="Emblemas" className="rounded-sm border px-2.5 py-2 flex items-center justify-between gap-2" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}66` }}>
          <div className="flex flex-col">
            <span className="text-[12px] font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Emblemas</span>
            <span className="text-[11px]" style={{ color: colors.text.secondary }}>{emblemas.texto}</span>
          </div>
          {emblemas.total > 0 && (
            <Link href="/personagem?aba=emblemas" className="shrink-0 px-2.5 py-1 rounded font-cinzel font-bold text-[11px]" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
              Abrir emblemas
            </Link>
          )}
        </section>

        <div role="tablist" aria-label="Categorias da mochila" className="grid grid-cols-4 gap-1">
          {CATEGORIAS_MOCHILA.map((c) => {
            const ativa = c.id === aba;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(c.id)}
                className="rounded-sm border px-1 py-1.5 text-[11px] font-cinzel font-bold"
                style={{ backgroundColor: ativa ? colors.accent.primary : colors.background.secondary, color: ativa ? colors.background.secondary : colors.text.primary, borderColor: ativa ? colors.accent.primary : `${OURO}66` }}
              >
                {c.nome} ({abas[c.id].length})
              </button>
            );
          })}
        </div>

        {vazia ? (
          <div className="rounded-sm border-2 p-6 flex flex-col items-center gap-2 text-center" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>
            <Package className="w-8 h-8" style={{ color: OURO }} />
            <span className="text-sm" style={{ color: colors.text.secondary }}>Sua mochila está vazia. Os materiais e os orbes caem dos monstros da Caçada.</span>
            <Link href="/cacada" className="mt-1 px-3 py-1.5 rounded font-cinzel font-bold text-xs" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>Ir caçar</Link>
          </div>
        ) : itens.length === 0 ? (
          <div role="tabpanel" className="rounded-sm border p-4 text-center text-[12px]" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}66`, color: colors.text.secondary }}>
            {categoria.vazio}
          </div>
        ) : (
          <section role="tabpanel" aria-label={categoria.nome} className="grid grid-cols-2 gap-2">
            {itens.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setAberto(i.id)}
                aria-label={`${i.nome}, ${i.quantidade} unidades. Ver detalhes`}
                className="rounded-sm border-2 px-2 py-1.5 flex flex-col text-left"
                style={{ backgroundColor: colors.background.secondary, borderColor: `${i.cor}99` }}
              >
                <span className="flex items-start justify-between gap-1 w-full">
                  <span className="text-[12px] font-semibold leading-tight" style={{ color: i.cor }}>{i.nome}</span>
                  <span className="text-[13px] font-cinzel font-black" style={{ color: colors.text.primary }}>×{i.quantidade}</span>
                </span>
                <span className="text-[10px]" style={{ color: colors.text.secondary }}>{i.subtitulo}</span>
              </button>
            ))}
          </section>
        )}
      </div>

      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={() => setAberto(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detalhe.nome}
            className="w-full max-w-[400px] rounded-sm border-2 p-3 flex flex-col gap-2"
            style={{ backgroundColor: colors.background.secondary, borderColor: detalhe.cor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-cinzel font-extrabold" style={{ color: detalhe.cor }}>{detalhe.nome}</h2>
              <button type="button" aria-label="Fechar" onClick={() => setAberto(null)} className="p-1" style={{ color: colors.text.secondary }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <dl className="flex flex-col gap-1.5">
              {detalhe.linhas.map((l) => (
                <div key={l.rotulo} className="flex flex-col">
                  <dt className="text-[10px] uppercase tracking-wider" style={{ color: colors.text.secondary }}>{l.rotulo}</dt>
                  <dd className="text-[12px]" style={{ color: colors.text.primary }}>{l.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </main>
  );
}
