'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { ResumoDaMissao } from '@/game/missoes';

/** A lista de missões do personagem: as em andamento, com cada objetivo e o andamento, e as concluídas. */
export function MissoesPanel({ ativas, concluidas, aoFechar }: { ativas: ResumoDaMissao[]; concluidas: ResumoDaMissao[]; aoFechar: () => void }) {
  return (
    <div role="dialog" aria-label="Missões" className="absolute inset-0 z-20 flex flex-col overflow-auto p-3 gap-3" style={{ backgroundColor: 'rgba(11,10,9,0.96)' }}>
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-[15px] font-bold" style={{ color: '#F5E3B3' }}>Missões</h2>
        <button type="button" aria-label="Fechar as missões" onClick={aoFechar} className="rounded border p-1.5" style={{ borderColor: '#C8A65688' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <section aria-label="Em andamento" className="flex flex-col gap-2">
        <h3 className="text-[12px] font-bold">Em andamento ({ativas.length})</h3>
        {ativas.length === 0 && <p className="text-[12px] opacity-70">Nenhuma missão em andamento. Converse com as pessoas e explore.</p>}
        {ativas.map((m) => (
          <article key={m.id} className="rounded-sm border p-2" style={{ borderColor: '#C8A65666' }}>
            <h4 className="text-[13px] font-bold" style={{ color: '#E6C775' }}>{m.titulo}</h4>
            {m.descricao && <p className="mt-0.5 whitespace-pre-line text-[12px] opacity-90">{m.descricao}</p>}
            <ul className="mt-1.5 flex flex-col gap-0.5 text-[12px]">
              {m.objetivos.map((o) => (
                <li key={o.id} className={o.cumprido ? 'opacity-60 line-through' : ''}>
                  {o.cumprido ? '✓' : '○'} {o.texto}{o.meta > 1 ? ` (${o.atual}/${o.meta})` : ''}
                </li>
              ))}
            </ul>
            {(m.recompensa.xp > 0 || m.recompensa.ouro > 0 || m.recompensa.itens.length > 0) && (
              <p className="mt-1.5 text-[11px] opacity-80">
                Recompensa: {[m.recompensa.xp > 0 ? `${m.recompensa.xp} XP` : '', m.recompensa.ouro > 0 ? `${m.recompensa.ouro} de ouro` : '', ...m.recompensa.itens.map((i) => `${i.qtd} × ${i.id.replace(/-/g, ' ')}`)].filter(Boolean).join(', ')}
              </p>
            )}
          </article>
        ))}
      </section>

      {concluidas.length > 0 && (
        <section aria-label="Concluídas" className="flex flex-col gap-1">
          <h3 className="text-[12px] font-bold">Concluídas ({concluidas.length})</h3>
          {concluidas.map((m) => (
            <p key={m.id} className="text-[12px] opacity-80">✓ {m.titulo}</p>
          ))}
        </section>
      )}
    </div>
  );
}
