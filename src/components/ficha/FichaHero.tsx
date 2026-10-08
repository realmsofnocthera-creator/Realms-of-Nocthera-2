'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { getRaceById } from '@/rules/races';
import { getClassById } from '@/rules/classes';
import { resolveAvatarSrc } from '@/assets/avatars';
import { calcularPoderTotal, xpParaProximoNivel } from '@/game';
import { FichaSidebar } from './FichaSidebar';
import { FichaAtributos } from './FichaAtributos';

interface FichaHeroProps {
  character: CharacterDocument;
  onAvatarChange?: (newAvatarId: string) => void;
  onOpenLupa?: () => void;
  className?: string;
}

export function FichaHero({
  character,
  onOpenLupa,
  className = '',
}: FichaHeroProps) {
  const raca = getRaceById(character.racaId);
  const classe = getClassById(character.classeId);
  const avatarSrc = resolveAvatarSrc(character.avatarId, character.classeId);
  const poderTotal = calcularPoderTotal(character.atributos);

  // Cálculo de XP e Nível
  const isMaxLevel = character.nivel >= 30;
  let xpNext = 0;
  if (!isMaxLevel) {
    try {
      xpNext = xpParaProximoNivel(character.nivel);
    } catch {
      xpNext = character.xpAtual || 100;
    }
  }

  const xpPercent = isMaxLevel
    ? 100
    : xpNext > 0
    ? Math.min(100, Math.max(0, (character.xpAtual / xpNext) * 100))
    : 0;

  return (
    <section
      aria-label="Herói do Personagem"
      className={`relative w-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden select-none ${className}`}
    >
      {/* Imagem de Corpo Inteiro da Classe/Avatar: posicionada mais à esquerda e por baixo de toda a HUD */}
      <div className="absolute inset-y-0 left-0 right-16 sm:right-28 flex items-end justify-center pointer-events-none z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc}
          alt={`Arte de corpo inteiro de ${character.nome}`}
          className="h-[80%] sm:h-[95%] w-auto max-w-[85vw] sm:max-w-md object-contain object-bottom -translate-x-8 sm:-translate-x-14 select-none pointer-events-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)]"
        />
        {/* Degradê escuro na base da arte para fusão com a moldura inferior */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/40 to-transparent pointer-events-none"
        />
      </div>

      {/* Camada de Conteúdo Interativo sobre a Arte */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col justify-between">
        {/* TOPO: Sidebar à esquerda + Bloco de Identidade e Moldura de Atributos à direita */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-2 w-full">
          {/* BARRA LATERAL (4 botões verticais sem botão de avatar) */}
          <div className="flex flex-col gap-1.5 pt-0.5 shrink-0">
            <FichaSidebar />
          </div>

          {/* COLUNA DIREITA: Bloco de Identidade (Nome, Raça, Nível, XP) + Moldura de Atributos */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Bloco de Identidade com fundo degradê roxo escuro */}
            <div
              className="w-[clamp(168px,44vw,218px)] rounded-lg p-1.5 sm:p-2 border border-[#8B5CF6]/35 shadow-xl flex flex-col gap-0.5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(35,18,43,0.95) 0%, rgba(23,11,28,0.96) 60%, rgba(13,13,13,0.95) 100%)',
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <h1 className="font-cinzel font-bold text-xs sm:text-[13px] text-[#F5F3E0] tracking-wider truncate leading-tight">
                    {character.nome}
                  </h1>
                  <p className="font-cinzel text-[9px] sm:text-[10px] text-[#D5C7A4] tracking-wide truncate">
                    {raca?.nome || 'Humano'}
                    {character.linhagem ? ` (${character.linhagem})` : ''} • {classe?.nome || 'Bárbaro'}
                  </p>
                </div>
                <span className="font-cinzel font-bold text-xs sm:text-[13px] text-[#F5C542] shrink-0 tabular-nums">
                  Nv. {character.nivel}/30
                </span>
              </div>

              {/* Barra de XP */}
              <div className="w-full mt-0.5">
                <div className="w-full h-1 bg-[#0D0D0D]/90 rounded-full overflow-hidden border border-[#8B5CF6]/30">
                  <div
                    className="h-full bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#ED8A0C] transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[8px] sm:text-[8.5px] text-[#D5C7A4]/80 font-cinzel mt-0.5 tabular-nums leading-none">
                  <span>XP</span>
                  <span>
                    {isMaxLevel
                      ? 'Nível máximo'
                      : `${character.xpAtual} / ${xpNext}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Moldura de Atributos alinhada à direita */}
            <FichaAtributos character={character} onOpenLupa={onOpenLupa} />
          </div>
        </div>

        {/* BASE: Selo de Poder Total no canto inferior esquerdo */}
        <div className="flex items-end justify-between pt-1 pb-0.5">
          <div className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-[#D946EF]/90 via-[#A855F7]/85 to-[#7E22CE]/80 border border-[#F472B6]/60 shadow-[0_0_12px_rgba(217,70,239,0.45)] select-none">
            {/* Ícone de Chama / Punho estilizado */}
            <div className="w-4 h-4 rounded bg-[#120F0C] border border-[#F472B6] flex items-center justify-center text-[#F5F3E0] shadow-inner rotate-45 shrink-0">
              <span className="-rotate-45 font-black text-[9px] text-[#F472B6]">✦</span>
            </div>
            <span className="font-cinzel font-black italic text-xs sm:text-sm tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tabular-nums">
              {poderTotal >= 1000 ? `${(poderTotal / 1000).toFixed(1)}K` : poderTotal}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
