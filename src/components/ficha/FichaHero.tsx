'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { calcularPoderTotal, xpParaProximoNivel } from '@/game';
import { resolveAvatarSrc } from '@/assets/avatars';
import { FICHA_UI, ICONES_DA_FICHA, POSICOES_DA_FICHA } from '@/assets/personagemUi';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
import { formatarCompacto } from '@/rules/numerosCompactos';
import { FichaAtributos } from './FichaAtributos';
import type { AbaFicha } from './FichaSidebar';

interface FichaHeroProps {
  character: CharacterDocument;
  onOpenLupa?: () => void;
  /** Aba aberta: nas abas Equipamentos e Emblemas, a coluna da direita troca de conteúdo. */
  aba?: AbaFicha;
  onMudarAba?: (aba: AbaFicha) => void;
  onAbrirAlma?: () => void;
  colunaEquipamentos?: React.ReactNode;
  colunaEmblemas?: React.ReactNode;
  className?: string;
}

const CONTORNO = '0.2cqw 0 0 #0B0610, -0.2cqw 0 0 #0B0610, 0 0.2cqw 0 #0B0610, 0 -0.2cqw 0 #0B0610';

/**
 * O herói da ficha (arte do Yuri): a arte de corpo inteiro atrás de tudo, a moldura de identidade (nome, nível e XP,
 * escritos em código) e o painel de atributos à direita, e o selo de Poder Total no canto de baixo.
 */
export function FichaHero({ character, onOpenLupa, aba = 'personagem', colunaEquipamentos, colunaEmblemas, className = '' }: FichaHeroProps) {
  const avatarSrc = resolveAvatarSrc(character.avatarId, character.classeId);
  const t = TEXTOS_DA_FICHA.identidade;
  // Poder Total: o número que o servidor guarda (atributos efetivos mais as habilidades de armadura)
  const poderTotal =
    character.poderTotal ??
    calcularPoderTotal(character.atributos) +
    Object.values(character.bonusReforco ?? {}).reduce((soma, v) => soma + Number(v || 0), 0) +
    Object.values(character.bonusEquipamento ?? {}).reduce((soma, v) => soma + Number(v || 0), 0);

  const isMaxLevel = character.nivel >= 30;
  let xpNext = 0;
  if (!isMaxLevel) {
    try {
      xpNext = xpParaProximoNivel(character.nivel);
    } catch {
      xpNext = 0;
    }
  }
  const xpPercent = isMaxLevel ? 100 : xpNext > 0 ? Math.min(100, Math.max(0, (character.xpAtual / xpNext) * 100)) : 0;
  const { barra } = POSICOES_DA_FICHA.identidade;

  return (
    <section aria-label="Herói do Personagem" className={`relative w-full flex-1 min-h-0 overflow-hidden select-none ${className}`}>
      {/* A arte de corpo inteiro da classe, por baixo da moldura */}
      <div className="absolute inset-y-0 left-0 w-[74%] flex items-end justify-center pointer-events-none z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} alt={`Arte de corpo inteiro de ${character.nome}`} draggable={false} className="h-[100%] w-auto max-w-full object-contain object-bottom -translate-x-[8%] select-none pointer-events-none drop-shadow-[0_1.4cqw_2.6cqw_rgba(0,0,0,0.9)]" />
      </div>

      <div className="relative z-10 h-full w-full flex flex-col items-end gap-[1.2cqw] px-[3cqw]">
        {/* Identidade: nome, nível e a barra de XP */}
        <div className="relative shrink-0" style={{ width: '47cqw', aspectRatio: '479 / 105' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={FICHA_UI.identidade} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
          <div className="absolute flex items-center justify-between gap-[1cqw]" style={{ left: '9%', right: '5%', top: `${POSICOES_DA_FICHA.identidade.nome.topo}%`, height: `${POSICOES_DA_FICHA.identidade.nome.altura}%` }}>
            <h1 className="min-w-0 truncate font-cinzel font-extrabold leading-[1.3] text-[#F5F3E0]" style={{ fontSize: '3.8cqw', textShadow: CONTORNO }}>{character.nome}</h1>
            <span className="shrink-0 font-cinzel font-black leading-none tabular-nums text-[#EDB44C]" style={{ fontSize: '3.3cqw', textShadow: CONTORNO }}>{textoDaFicha(t.nivel, { nivel: character.nivel })}</span>
          </div>
          <div role="progressbar" aria-label={t.xp} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xpPercent)} className="absolute overflow-hidden bg-[#0B0610]" style={{ left: `${barra.esquerda}%`, width: `${barra.largura}%`, top: `${barra.topo}%`, height: `${barra.altura}%` }}>
            <div className="h-full" style={{ width: `${xpPercent}%`, background: 'linear-gradient(180deg, #A78BFA 0%, #7C3AED 55%, #5B21B6 100%)', boxShadow: '0 0 1.4cqw rgba(139,92,246,0.8)' }} />
          </div>
          <div className="absolute flex items-center justify-between font-cinzel font-bold uppercase leading-none tabular-nums text-[#D9CBA6]" style={{ left: '9%', right: '8%', top: `${POSICOES_DA_FICHA.identidade.rodape.topo}%`, height: `${POSICOES_DA_FICHA.identidade.rodape.altura}%`, fontSize: '2.3cqw', textShadow: CONTORNO }}>
            <span>{t.xp}</span>
            <span>{isMaxLevel ? t.nivelMaximo : `${formatarCompacto(character.xpAtual)} / ${formatarCompacto(xpNext)}`}</span>
          </div>
        </div>

        {/* A coluna da direita: os atributos (ou os espaços da aba Equipamentos/Emblemas) */}
        <div className="shrink-0" style={{ width: '47cqw' }}>
          {aba === 'equipamentos' && colunaEquipamentos ? colunaEquipamentos : aba === 'emblemas' && colunaEmblemas ? colunaEmblemas : <FichaAtributos character={character} onOpenLupa={onOpenLupa} />}
        </div>
      </div>

      {/* BASE: o selo de Poder Total no canto de baixo à esquerda */}
      <div aria-label={`${TEXTOS_DA_FICHA.poderTotal}: ${poderTotal}`} className="pilula-pixel absolute z-10 flex items-center gap-[1.2cqw] pl-[1cqw] pr-[2.4cqw] py-[0.8cqw]" style={{ left: '3cqw', bottom: '1cqw' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICONES_DA_FICHA.poder} alt="" aria-hidden="true" draggable={false} className="w-[6.4cqw] h-[6.4cqw] object-contain shrink-0" style={{ imageRendering: 'pixelated' }} />
        <span className="font-cinzel font-black italic tabular-nums text-[#F5F3E0]" style={{ fontSize: '3.8cqw', textShadow: CONTORNO }}>{poderTotal >= 1000 ? `${(poderTotal / 1000).toFixed(1)}K` : poderTotal}</span>
      </div>
    </section>
  );
}
