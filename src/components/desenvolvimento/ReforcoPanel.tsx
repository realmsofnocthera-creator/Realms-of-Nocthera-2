'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { estadoDoReforco } from '@/lib/progressaoHabilidadeTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { BotaoAcao, Feedback, fmt, Saldo, useAcaoDesenvolvimento } from './progressaoComum';

interface ReforcoPanelProps {
  character: CharacterDocument;
  idToken: string | null;
  onCharacterChange: (character: CharacterDocument) => void;
  className?: string;
}

/**
 * Reforço de Habilidade (2.2.2, botão "Melhorar Habilidade"): nível 0 a 30 pago com essência de
 * habilidade. Cada nível soma % nos 7 atributos (até +25%). No nível 30 libera a Ascensão.
 */
export function ReforcoPanel({ character, idToken, onCharacterChange, className = '' }: ReforcoPanelProps) {
  const { colors } = NOCTHERA_THEME;
  const estado = estadoDoReforco(character);
  const { ocupado, feedback, chamar } = useAcaoDesenvolvimento(idToken, onCharacterChange);
  const iconeEssencia = <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />;
  const progresso = (estado.nivel / estado.nivelMaximo) * 100;

  return (
    <div className={`h-full flex flex-col gap-2 w-full max-w-[320px] select-none overflow-y-auto overflow-x-hidden pr-0.5 ${className}`}>
      <Feedback feedback={feedback} />

      <Saldo icone={iconeEssencia} valor={character.essenciaHabilidade ?? 0} rotulo="Essência de habilidade" />

      <div
        className="rounded-md px-2 py-2 flex flex-col gap-1.5"
        style={{ background: `linear-gradient(165deg, ${colors.accent.primary}33 0%, ${colors.background.card} 100%)`, border: `1.5px solid ${colors.accent.primary}88` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-black font-cinzel" style={{ color: colors.text.primary }}>Reforço de Habilidade</span>
          <span className="text-[11px] font-bold font-cinzel px-1.5 py-0.5 rounded" style={{ backgroundColor: '#000000bb', color: colors.accent.primary }}>
            Nv {estado.nivel}/{estado.nivelMaximo}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={estado.nivelMaximo}
          aria-valuenow={estado.nivel}
          aria-label="Nível do Reforço de Habilidade"
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: `${colors.border.default}44` }}
        >
          <div className="h-full rounded-full" style={{ width: `${progresso}%`, backgroundColor: colors.accent.primary }} />
        </div>
        <span className="text-[11px] leading-snug" style={{ color: colors.text.secondary }}>
          Bônus atual nos 7 atributos: <b style={{ color: colors.accent.primary }}>{estado.bonusAtual}</b>
          {estado.bonusProximoNivel && <> · próximo nível: {estado.bonusProximoNivel}</>}
        </span>
        <span className="text-[10px] leading-snug" style={{ color: colors.text.secondary }}>
          Níveis 1–10: +0,5% cada · 11–20: +0,8% · 21–30: +1,2% (máximo +25%). No nível 30 libera a Ascensão de Habilidade.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1" aria-label="Bônus do Reforço em cada atributo">
        {ATTRIBUTES.map((attr) => (
          <div
            key={attr}
            title={ATTRIBUTE_DISPLAY_NAMES[attr]}
            className="rounded px-1.5 py-0.5 flex items-center gap-1"
            style={{ backgroundColor: `${colors.background.card}ee`, border: `1px solid ${colors.border.default}44` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ATTRIBUTE_ICONS[attr]} alt="" aria-hidden="true" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="text-[10px] font-bold font-cinzel truncate" style={{ color: colors.text.primary }}>
              {ATTRIBUTE_DISPLAY_NAMES[attr]}
            </span>
            <span className="ml-auto text-[10px] font-bold font-cinzel" style={{ color: colors.accent.primary }}>
              +{character.bonusReforco?.[attr] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {estado.custo !== null ? (
        <BotaoAcao
          rotulo={`Reforçar para o nível ${estado.nivel + 1}`}
          habilitado={estado.habilitado}
          ocupado={ocupado}
          onClick={() => chamar('/api/character/habilidades/reforcar', `Reforço no nível ${estado.nivel + 1}!`)}
          custo={
            <span
              aria-label={`Essência de habilidade: ${estado.custo}${estado.habilitado ? '' : ' (insuficiente)'}`}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold font-cinzel"
              style={{ color: estado.habilitado ? colors.text.primary : '#F5A6A6' }}
            >
              {iconeEssencia}
              {fmt(estado.custo)}
            </span>
          }
        />
      ) : null}
      {estado.aviso && (
        <span className="text-[10px] text-center font-semibold" style={{ color: colors.text.secondary }}>
          {estado.aviso}
        </span>
      )}
    </div>
  );
}
