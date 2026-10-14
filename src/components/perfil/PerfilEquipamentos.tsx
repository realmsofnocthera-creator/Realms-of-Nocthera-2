'use client';

import React, { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { ItemEquipamentoTela } from '@/lib/equipamentoTela';
import { SLOTS_DO_PERFIL, type EquipamentoPerfil } from '@/lib/perfilEquipamentos';

export interface PerfilEquipamentosProps {
  /** O que o perfil mostra agora (até 4). */
  itens: EquipamentoPerfil[];
  /** No próprio perfil, o jogador toca num espaço para escolher o item. */
  editavel: boolean;
  /** Os itens equipados agora, para o jogador escolher (só no próprio perfil). */
  equipados?: ItemEquipamentoTela[];
  salvando?: boolean;
  erro?: string | null;
  onSalvar?: (ids: string[]) => void;
}

/** Seção "Equipamentos principais" do perfil público: 4 espaços com os itens que o jogador escolheu mostrar. */
export function PerfilEquipamentos({ itens, editavel, equipados = [], salvando = false, erro = null, onSalvar }: PerfilEquipamentosProps) {
  const [aberto, setAberto] = useState<number | null>(null);

  useEffect(() => {
    if (aberto === null) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null);
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberto]);

  const escolher = (indice: number, id: string | null) => {
    const sem = itens.map((i) => i.id).filter((x, pos) => x !== id && pos !== indice);
    if (id !== null) sem.splice(Math.min(indice, sem.length), 0, id);
    setAberto(null);
    onSalvar?.(sem);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: SLOTS_DO_PERFIL }, (_, i) => {
          const item = itens[i];
          const conteudo = item ? (
            <>
              <span className="text-[7px] sm:text-[8px] font-cinzel uppercase tracking-wide text-[#D5C7A4] leading-tight">{item.slotNome}</span>
              <span className="mt-0.5 text-[9px] sm:text-[10px] font-cinzel font-bold leading-tight line-clamp-3" style={{ color: item.cor }}>{item.nome}</span>
              <span className="mt-auto text-[8px] sm:text-[9px] text-[#E2D6B6] leading-tight">{item.raridadeNome}</span>
              <span className="text-[8px] sm:text-[9px] font-semibold text-[#F5F3E0] leading-tight">{item.curto}</span>
            </>
          ) : editavel ? (
            <span className="m-auto flex flex-col items-center gap-0.5 text-[#D4AF37]">
              <Plus className="w-4 h-4" />
              <span className="text-[8px] sm:text-[9px] font-cinzel leading-tight">Escolher</span>
            </span>
          ) : (
            <span className="m-auto text-[8px] sm:text-[9px] font-cinzel text-[#9E8F73] leading-tight">Vazio</span>
          );
          const classe = 'aspect-[3/4] rounded bg-gradient-to-b from-[#2A221E] to-[#171210] flex flex-col p-1 text-left shadow-sm';
          const estilo = { border: item ? `1px solid ${item.cor}` : '1px dashed #C8A65699' };
          return editavel ? (
            <button
              key={i}
              type="button"
              onClick={() => setAberto(i)}
              aria-label={item ? `Espaço ${i + 1}: ${item.nome}. Trocar` : `Espaço ${i + 1} vazio. Escolher item`}
              className={`${classe} cursor-pointer`}
              style={estilo}
            >
              {conteudo}
            </button>
          ) : (
            <div key={i} className={classe} style={estilo} aria-label={item ? `${item.slotNome}: ${item.nome}, ${item.raridadeNome}, ${item.curto}` : `Espaço ${i + 1} vazio`}>
              {conteudo}
            </div>
          );
        })}
      </div>
      {erro && <p role="alert" className="text-[9px] sm:text-[10px] text-[#9E1C1C] font-semibold leading-tight">{erro}</p>}

      {editavel && aberto !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3" onClick={() => setAberto(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Escolher equipamento do perfil"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] rounded-lg bg-[#16120E] border-2 border-[#D4AF37] p-2.5 text-[#F5F3E0] shadow-[0_14px_34px_rgba(0,0,0,0.92)] flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between border-b border-[#C8A656]/35 pb-1">
              <span className="font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#ED8A0C]">Espaço {aberto + 1} do perfil</span>
              <button type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="text-[#D5C7A4] hover:text-[#F5F3E0] cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {equipados.length === 0 ? (
              <p className="py-3 text-center text-[11px] text-[#D5C7A4] italic">Você não tem nenhum item equipado. Equipe armas e armaduras na ficha.</p>
            ) : (
              <ul className="flex flex-col gap-1 max-h-[260px] overflow-y-auto">
                {equipados.map((e) => {
                  const noPerfil = itens.some((i) => i.id === e.id);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        disabled={salvando}
                        onClick={() => escolher(aberto, e.id)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[#221C16] hover:bg-[#2E251D] border text-left cursor-pointer disabled:opacity-50"
                        style={{ borderColor: `${e.cor}99` }}
                      >
                        <span className="flex flex-col min-w-0">
                          <span className="text-[11px] font-cinzel font-bold truncate" style={{ color: e.cor }}>{e.nome}</span>
                          <span className="text-[9px] text-[#D5C7A4] truncate">{e.raridadeNome} · {e.curto}</span>
                        </span>
                        {noPerfil && <Check className="w-3.5 h-3.5 shrink-0 text-[#7EDC8A]" aria-label="Já está no perfil" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {itens[aberto] && (
              <button
                type="button"
                disabled={salvando}
                onClick={() => escolher(aberto, null)}
                className="px-2 py-1 rounded border border-[#C8A656]/40 text-[10px] font-cinzel text-[#D5C7A4] hover:text-[#F5F3E0] cursor-pointer disabled:opacity-50"
              >
                Deixar este espaço vazio
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
