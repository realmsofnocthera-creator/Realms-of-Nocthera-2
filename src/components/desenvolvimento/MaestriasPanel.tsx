'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import {
  marcosAlcancados,
  MARCO_A_CADA,
  NIVEL_MAXIMO_DA_MAESTRIA,
  NOME_DO_GRUPO_DE_MAESTRIA,
  nivelDaMaestria,
  TETO_DIARIO_DE_XP,
  textoDoBonusDaTrilha,
  TRILHAS_DE_MAESTRIA,
  xpRestanteHoje,
  type GrupoDeMaestria,
  type TrilhaDeMaestria,
} from '@/rules/maestrias';
import { NOCTHERA_THEME } from '@/theme/theme';

interface MaestriasPanelProps {
  character: CharacterDocument;
  className?: string;
}

const GRUPOS = Object.keys(NOME_DO_GRUPO_DE_MAESTRIA) as GrupoDeMaestria[];
const fmt = (n: number) => n.toLocaleString('pt-BR');

function Trilha({ trilha, character, dia }: { trilha: TrilhaDeMaestria; character: CharacterDocument; dia: string }) {
  const { colors } = NOCTHERA_THEME;
  const progresso = character.maestrias?.[trilha.id];
  const { nivel, xpNoNivel, xpParaProximo } = nivelDaMaestria(progresso?.xp ?? 0);
  const hoje = TETO_DIARIO_DE_XP - xpRestanteHoje(progresso, dia);
  const proximoMarco = nivel >= NIVEL_MAXIMO_DA_MAESTRIA ? null : (marcosAlcancados(nivel) + 1) * MARCO_A_CADA;
  const largura = xpParaProximo ? (xpNoNivel / xpParaProximo) * 100 : 100;

  return (
    <li
      className="rounded-md px-2 py-1.5 flex flex-col gap-1"
      style={{ background: `linear-gradient(165deg, ${colors.accent.primary}22 0%, ${colors.background.card} 100%)`, border: `1px solid ${colors.accent.primary}66`, opacity: trilha.bloqueada ? 0.6 : 1 }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[13px] font-black font-cinzel flex items-center gap-1" style={{ color: colors.text.primary }}>
          {trilha.bloqueada && <Lock className="w-3 h-3" aria-hidden="true" />}
          {trilha.nome}
        </span>
        <span className="text-[10px] font-bold font-cinzel px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: '#000000bb', color: colors.accent.primary }}>
          {trilha.bloqueada ? 'Em breve' : `Nv ${nivel}/${NIVEL_MAXIMO_DA_MAESTRIA}`}
        </span>
      </div>
      {!trilha.bloqueada && (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={xpParaProximo ?? 1}
            aria-valuenow={xpParaProximo ? xpNoNivel : 1}
            aria-label={`Progresso da maestria ${trilha.nome}`}
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: `${colors.border.default}44` }}
          >
            <div className="h-full rounded-full" style={{ width: `${largura}%`, backgroundColor: colors.accent.primary }} />
          </div>
          <span className="text-[10px]" style={{ color: colors.text.secondary }}>
            {xpParaProximo ? `${fmt(xpNoNivel)}/${fmt(xpParaProximo)} XP` : 'Nível máximo'} · hoje {fmt(hoje)}/{fmt(TETO_DIARIO_DE_XP)}
            {proximoMarco ? ` · próximo marco: Nv ${proximoMarco}` : ''}
          </span>
          <span className="text-[11px] font-semibold" style={{ color: colors.accent.primary }}>{textoDoBonusDaTrilha(trilha.id, nivel)}</span>
        </>
      )}
      <span className="text-[10px] leading-snug" style={{ color: colors.text.secondary }}>
        {trilha.comoSobe} Por nível: {trilha.porNivel} A cada {MARCO_A_CADA} níveis: {trilha.porMarco}
      </span>
    </li>
  );
}

/**
 * Maestrias: 100 níveis por trilha, marcos a cada 10. Sobem jogando (lutas, forja e expedição), com teto de XP por
 * dia em cada trilha. As de monstro aparecem bloqueadas até o bestiário ser classificado.
 */
export function MaestriasPanel({ character, className = '' }: MaestriasPanelProps) {
  const { colors } = NOCTHERA_THEME;
  const [grupo, setGrupo] = useState<GrupoDeMaestria>('armas');
  const dia = diaDeBrasilia(new Date());

  return (
    <div className={`h-full flex flex-col gap-1.5 w-full max-w-[320px] select-none overflow-y-auto overflow-x-hidden pr-0.5 ${className}`}>
      <div role="tablist" aria-label="Grupos de maestria" className="flex flex-wrap gap-1">
        {GRUPOS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={grupo === g}
            onClick={() => setGrupo(g)}
            className="rounded px-1.5 py-0.5 text-[11px] font-bold font-cinzel"
            style={{
              backgroundColor: grupo === g ? colors.accent.primary : colors.background.cardElevated,
              color: grupo === g ? colors.background.secondary : colors.text.primary,
              border: `1px solid ${colors.accent.primary}88`,
            }}
          >
            {NOME_DO_GRUPO_DE_MAESTRIA[g]}
          </button>
        ))}
      </div>
      <span className="text-[10px] leading-snug" style={{ color: colors.text.secondary }}>
        Cada trilha ganha no máximo {fmt(TETO_DIARIO_DE_XP)} XP por dia (zera à meia-noite de Brasília).
        {grupo === 'monstros' && ' As maestrias de monstro abrem quando o bestiário for classificado.'}
      </span>
      <ul className="flex flex-col gap-1.5">
        {TRILHAS_DE_MAESTRIA.filter((t) => t.grupo === grupo).map((t) => (
          <Trilha key={t.id} trilha={t} character={character} dia={dia} />
        ))}
      </ul>
    </div>
  );
}
