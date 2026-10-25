'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { SkipForward } from 'lucide-react';
import type { ResultadoCombatePvp } from '@/game/combat';
import { resolveAvatarSrc } from '@/assets/avatars';
import { BarraVidaEscudo } from '@/components/cacada/CombateCacada';
import { quadrosDaArena } from '@/lib/arenaReplay';
import { CLASSES_MAP } from '@/rules/classes';
import { EFEITOS_STATUS } from '@/rules/statusEffects';
import type { LadoNaTela } from '@/server/arena';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';
const PASSO_MS = 650;

function Lutador({ lado, painel, direita }: { lado: LadoNaTela; painel: ReturnType<typeof quadrosDaArena>[number]['a']; direita?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 flex flex-col gap-1 ${direita ? 'items-end text-right' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveAvatarSrc(lado.avatarId, lado.classeId)}
        alt={lado.nome}
        className="w-14 h-14 rounded-full object-cover border-2"
        style={{ borderColor: `${OURO}88`, opacity: painel.hp > 0 ? 1 : 0.3, transform: direita ? 'scaleX(-1)' : undefined }}
        draggable={false}
      />
      <span className="text-xs font-bold truncate max-w-full" style={{ color: '#F5E3B3' }}>{lado.nome}</span>
      <span className="text-[10px]" style={{ color: NOCTHERA_THEME.colors.text.secondary }}>
        {CLASSES_MAP[lado.classeId]?.nome ?? lado.classeId} · nível {lado.nivel}
      </span>
      <div className="w-full">
        <BarraVidaEscudo painel={painel} />
      </div>
      {painel.status.length > 0 && (
        <span className="text-[10px]" style={{ color: '#E6C775' }}>{painel.status.map((s) => EFEITOS_STATUS[s]?.nome ?? s).join(' · ')}</span>
      )}
    </div>
  );
}

/** Replay de uma luta da Arena: os dois lados, a vida e o escudo golpe a golpe, os status e o log. */
export function ReplayArena({ combate, lados, titulo, onFim }: { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; titulo: string; onFim: () => void }) {
  const { colors } = NOCTHERA_THEME;
  const quadros = useMemo(() => quadrosDaArena(combate, lados.a, lados.b), [combate, lados]);
  const [i, setI] = useState(0);
  const fim = i >= quadros.length - 1;
  useEffect(() => {
    if (fim) return;
    const id = window.setTimeout(() => setI((x) => x + 1), PASSO_MS);
    return () => window.clearTimeout(id);
  }, [i, fim]);
  const q = quadros[Math.min(i, quadros.length - 1)];
  const resultado = combate.vencedor === 'ninguem' ? 'Empate: os dois perdem' : `${combate.vencedor === 'a' ? lados.a.nome : lados.b.nome} venceu`;
  return (
    <section className="flex flex-col gap-3 rounded-sm border p-3" style={{ borderColor: OURO, backgroundColor: 'rgba(14, 11, 14, 0.9)' }} aria-label="Replay da luta">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>{titulo}</h2>
        <span className="text-[11px] font-bold" style={{ color: OURO }}>Rodada {q.rodada}</span>
      </div>
      <div className="flex gap-3 items-start">
        <Lutador lado={lados.a} painel={q.a} />
        <span className="self-center text-xs font-cinzel font-extrabold" style={{ color: OURO }}>×</span>
        <Lutador lado={lados.b} painel={q.b} direita />
      </div>
      <ol className="flex flex-col gap-0.5 min-h-[92px] text-[11px]" aria-live="polite" style={{ color: colors.text.secondary }}>
        {q.linhas.map((l, k) => (
          <li key={`${i}-${k}`} style={{ color: k === q.linhas.length - 1 ? '#F5E3B3' : undefined }}>{l}</li>
        ))}
      </ol>
      {fim ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold" style={{ color: '#F5E3B3' }}>{resultado}</span>
          <button type="button" onClick={onFim} className="rounded-sm border px-3 py-1.5 text-xs font-bold" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
            Continuar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setI(quadros.length - 1)} className="self-end flex items-center gap-1 rounded-sm border px-3 py-1.5 text-xs font-bold" style={{ borderColor: OURO, color: '#F5E3B3' }}>
          <SkipForward className="w-3.5 h-3.5" /> Pular
        </button>
      )}
    </section>
  );
}
