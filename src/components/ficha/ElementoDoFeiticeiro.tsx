'use client';

import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { NOME_ELEMENTO } from '@/lib/cacadaTela';
import { ELEMENTOS, type Elemento } from '@/rules/elements';
import type { CharacterDocument } from '@/server/characterService';

/**
 * Feiticeiro (1.5.2): escolhe 1 dos 7 elementos, que vale nas habilidades da classe sem elemento próprio (Faísca,
 * Explosão e Cataclismo Arcano). As habilidades de subclasse mantêm o elemento delas. Pode trocar quando quiser.
 */
export function ElementoDoFeiticeiro({ character }: { character: CharacterDocument }) {
  const [atual, setAtual] = useState<Elemento | undefined>(character.elementoDaClasse);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (character.classeId !== 'feiticeiro') return null;

  async function escolher(elemento: Elemento) {
    setOcupado(true);
    setErro(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/character/elemento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ elemento }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível escolher o elemento.');
      setAtual(elemento);
      setAberto(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível escolher o elemento.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Escolher o elemento do Feiticeiro"
        className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-cinzel text-[#E2D6B6] hover:text-[#ED8A0C] bg-[#120F0C]/85 border border-[#B2A66C]/50 hover:border-[#ED8A0C] px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#F5C542]" />
        <span>Elemento: {atual ? NOME_ELEMENTO[atual] : 'escolher'}</span>
      </button>
      {aberto && (
        <div role="dialog" aria-label="Elemento do Feiticeiro" className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6" onClick={() => setAberto(false)}>
          <div className="rounded-lg border border-[#B2A66C]/60 bg-[#120F0C] px-4 py-3 text-[#E2D6B6] w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-cinzel font-bold">Elemento do Feiticeiro</p>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[11px] mb-2 text-stone-400">Vale na Faísca, na Explosão e no Cataclismo Arcano. As habilidades da subclasse continuam com o elemento delas. Dá para trocar quando quiser.</p>
            {erro && <p role="alert" className="text-[11px] text-red-400 mb-1">{erro}</p>}
            <div className="grid grid-cols-2 gap-1.5">
              {ELEMENTOS.map((el) => (
                <button
                  key={el}
                  type="button"
                  disabled={ocupado}
                  aria-pressed={atual === el}
                  onClick={() => void escolher(el)}
                  className={`rounded border px-2 py-1 text-xs font-cinzel disabled:opacity-50 ${atual === el ? 'border-[#ED8A0C] bg-[#2E251D] text-[#F5C542]' : 'border-[#B2A66C]/40 hover:border-[#ED8A0C]'}`}
                >
                  {NOME_ELEMENTO[el]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
