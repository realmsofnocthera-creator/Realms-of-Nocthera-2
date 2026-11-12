'use client';

import React from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTES } from '@/rules/attributes';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { EMBLEMA_DO_REFORCO } from '@/assets/reforcoUi';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { estadoDoReforco } from '@/lib/progressaoHabilidadeTela';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { BotaoDoKit, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';
import { fmt, useAcaoDesenvolvimento } from './progressaoComum';

interface ReforcoPanelProps {
  character: CharacterDocument;
  idToken: string | null;
  onCharacterChange: (character: CharacterDocument) => void;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** O ícone da essência de habilidade: a chama roxa que veio para a Mochila (o ícone de sempre desse saldo). */
const iconeEssencia = (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={ICONES_DE_SALDO.essenciaHabilidade} alt="" aria-hidden="true" draggable={false} className="w-[4.4cqw] h-[4.4cqw] object-contain shrink-0 pointer-events-none" style={pixel} />
);

/**
 * Reforço de Habilidade (2.2.2, botão "Melhorar Habilidade") em pixel: nível 0 a 30 pago com essência de habilidade.
 * Cada nível soma % nos 7 atributos (até +25%). No nível 30 libera a Ascensão. Os textos saem de `textosDaFicha.ts`.
 */
export function ReforcoPanel({ character, idToken, onCharacterChange, className = '' }: ReforcoPanelProps) {
  const t = TEXTOS_DA_FICHA.reforco;
  const estado = estadoDoReforco(character);
  const { ocupado, feedback, chamar } = useAcaoDesenvolvimento(idToken, onCharacterChange);
  const progresso = (estado.nivel / estado.nivelMaximo) * 100;

  return (
    <div className={`flex flex-col gap-[1.8cqw] w-full select-none ${className}`}>
      {feedback && <p role="alert" className={`font-cinzel font-bold text-[2.4cqw] leading-snug text-center ${feedback.type === 'success' ? 'text-[#9BE3A0]' : 'text-[#FFB4B4]'}`}>{feedback.message}</p>}

      {/* o saldo de essência */}
      <PainelDaForja borda="1.6cqw" role="group" aria-label={`${t.essencia}: ${character.essenciaHabilidade ?? 0}`} title={t.essencia} className="flex items-center justify-center gap-[1cqw] py-[0.4cqw]">
        {iconeEssencia}
        <span className="font-cinzel font-black text-[2.6cqw] leading-[1.4] tabular-nums text-[#F5F3E0]">{fmt(character.essenciaHabilidade ?? 0)}</span>
        <span className="font-cinzel text-[2cqw] leading-[1.4] text-[#9CC4E0]">{t.essencia}</span>
      </PainelDaForja>

      {/* o cabeçalho: o emblema da seta, o nome, o nível, a barra e as regras */}
      <PainelDaForja borda="2cqw" className="flex gap-[1.8cqw] items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={EMBLEMA_DO_REFORCO} alt="" aria-hidden="true" draggable={false} className="w-[15cqw] h-[15cqw] shrink-0 pointer-events-none" style={pixel} />
        <div className="min-w-0 flex-1 flex flex-col gap-[1.2cqw]">
          <div className="flex items-center justify-between gap-[1cqw]">
            <span className="font-cinzel font-black text-[2.8cqw] leading-[1.35] text-[#F5F3E0]" style={{ textShadow: CONTORNO_PIXEL }}>{t.titulo}</span>
            <span className="shrink-0 font-cinzel font-bold text-[2cqw] leading-[1.4] px-[1cqw] bg-[#05070D]/80 border border-[#B8862B] text-[#EDB44C]">{textoDaFicha(t.nivel, { n: estado.nivel, max: estado.nivelMaximo })}</span>
          </div>
          {/* a barra de nível: moldura dourada e enchimento em listras azuis */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={estado.nivelMaximo}
            aria-valuenow={estado.nivel}
            aria-label={t.nivelAria}
            className="h-[3.2cqw] border-[0.5cqw] border-[#B8862B] bg-[#05070D] p-[0.3cqw]"
          >
            <div className="h-full" style={{ width: `${progresso}%`, backgroundImage: 'repeating-linear-gradient(90deg, #6FE3EE 0 1.1cqw, #2F9FB8 1.1cqw 1.4cqw)' }} />
          </div>
          <span className="font-cinzel text-[2.1cqw] leading-snug text-[#E9DDC0]">
            {t.bonusAtual} <b className="text-[#EDB44C]">{estado.bonusAtual}</b>
            {estado.bonusProximoNivel && <> · {textoDaFicha(t.proximo, { bonus: estado.bonusProximoNivel })}</>}
          </span>
          <span className="font-cinzel text-[1.8cqw] leading-snug text-[#9CC4E0]">{t.regras}</span>
        </div>
      </PainelDaForja>

      {/* o bônus em cada atributo, com os ícones de sempre */}
      <div className="grid grid-cols-2 gap-[0.8cqw]" aria-label={t.porAtributo}>
        {ATTRIBUTES.map((attr) => (
          <div key={attr} title={ATTRIBUTE_DISPLAY_NAMES[attr]} className="flex items-center gap-[0.8cqw] border border-[#2B3F5C] bg-[#080C16]/80 px-[1cqw] py-[0.8cqw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ATTRIBUTE_ICONS[attr]} alt="" aria-hidden="true" draggable={false} className="w-[3.4cqw] h-[3.4cqw] object-contain shrink-0 pointer-events-none" />
            <span className="font-cinzel font-bold text-[2cqw] leading-[1.4] text-[#F5F3E0] truncate">{ATTRIBUTE_DISPLAY_NAMES[attr]}</span>
            <span className="ml-auto font-cinzel font-black text-[2.1cqw] leading-[1.4] text-[#EDB44C]">+{character.bonusReforco?.[attr] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* o botão de reforçar e o custo */}
      {estado.custo !== null && (
        <div className="flex flex-col items-stretch gap-[0.8cqw]">
          <BotaoDoKit
            onClick={() => chamar('/api/character/habilidades/reforcar', textoDaFicha(t.sucesso, { n: estado.nivel + 1 }))}
            disabled={!estado.habilitado || ocupado}
            className="w-full !text-[2.3cqw]"
          >
            {ocupado ? t.processando : textoDaFicha(t.reforcar, { n: estado.nivel + 1 })}
          </BotaoDoKit>
          <div className="flex items-center justify-center">
            <span aria-label={`${t.essencia}: ${estado.custo}${estado.habilitado ? '' : ` (${t.insuficiente})`}`} className={`inline-flex items-center gap-[0.6cqw] font-cinzel font-bold text-[2.1cqw] leading-[1.4] ${estado.habilitado ? 'text-[#E9DDC0]' : 'text-[#F5A6A6]'}`}>
              {iconeEssencia}
              {fmt(estado.custo)}
            </span>
          </div>
        </div>
      )}
      {estado.aviso && <span className="font-cinzel font-bold text-[2cqw] leading-snug text-center text-[#9CC4E0]">{estado.aviso}</span>}
    </div>
  );
}
