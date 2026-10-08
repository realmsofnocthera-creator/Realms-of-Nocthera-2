'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { FICHA_ASSETS } from '@/rules/fichaAssets';
import { ATTRIBUTE_ICONS, RESOURCE_ICONS } from '@/assets/icons';
import { calcularChanceCritico } from '@/game';

interface FichaAtributosProps {
  character: CharacterDocument;
  onOpenLupa?: () => void;
  className?: string;
}

export function FichaAtributos({
  character,
  onOpenLupa,
  className = '',
}: FichaAtributosProps) {
  const recursos = [
    {
      id: 'hp',
      nome: 'HP',
      icone: RESOURCE_ICONS.hp,
      atual: character.hpMax,
      max: character.hpMax,
      corValor: 'text-[#F5A6A6]',
    },
    {
      id: 'sobreescudo',
      nome: 'Sobreescudo',
      icone: RESOURCE_ICONS.sobreescudo,
      atual: character.sobreescudoMax,
      max: character.sobreescudoMax,
      corValor: 'text-[#F5C542]',
    },
  ];

  // Chance de crítico (2% de base + 0,1% por ponto de Sorte)
  const chanceCritico = `${String(
    character.chanceCritico ?? calcularChanceCritico(character.atributos.sorte)
  ).replace('.', ',')}%`;

  const atributos = [
    { id: 'vigor', nome: 'Vigor', icone: ATTRIBUTE_ICONS.vigor, valor: character.atributos.vigor },
    { id: 'sorte', nome: 'Sorte', icone: ATTRIBUTE_ICONS.sorte, valor: character.atributos.sorte },
    { id: 'forca', nome: 'Força', icone: ATTRIBUTE_ICONS.forca, valor: character.atributos.forca },
    { id: 'vitalidade', nome: 'Vitalidade', icone: ATTRIBUTE_ICONS.vitalidade, valor: character.atributos.vitalidade },
    { id: 'arcano', nome: 'Arcano', icone: ATTRIBUTE_ICONS.arcano, valor: character.atributos.arcano },
    { id: 'inteligencia', nome: 'Inteligência', icone: ATTRIBUTE_ICONS.inteligencia, valor: character.atributos.inteligencia },
    { id: 'agilidade', nome: 'Agilidade', icone: ATTRIBUTE_ICONS.agilidade, valor: character.atributos.agilidade },
  ];

  return (
    <div
      className={`relative aspect-[534/800] w-[clamp(168px,44vw,218px)] max-h-[300px] sm:max-h-[330px] bg-no-repeat bg-center bg-[length:100%_100%] shadow-2xl select-none shrink-0 ${className}`}
      style={{
        backgroundImage: `url(${FICHA_ASSETS.molduraAtributos})`,
      }}
    >
      {/* Botão de lupa no canto superior direito da moldura: abre o modal de explicações */}
      <button
        type="button"
        onClick={onOpenLupa}
        aria-label="Explicações"
        className="absolute top-[3%] right-[6%] w-5 h-5 sm:w-6 sm:h-6 rounded border border-[#B2A66C]/60 bg-[#120F0C]/90 hover:bg-[#2B2824] text-[#F5C542] hover:text-[#ED8A0C] hover:border-[#ED8A0C] flex items-center justify-center cursor-pointer shadow-sm z-30 transition-all active:scale-95"
      >
        <svg
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-current"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Conteúdo com padding equilibrado para a nova moldura: top 13%, bottom 6%, left 9%, right 12% */}
      <div className="absolute inset-0 pt-[13%] pb-[6%] pl-[9%] pr-[12%] flex flex-col justify-between text-[#F5F3E0] font-cinzel text-[9.5px] sm:text-[10.5px]">
        {/* 3 Linhas de Recursos (HP, Sobreescudo, Crítico) */}
        <div className="flex flex-col justify-around flex-1">
          {recursos.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between gap-1 py-[1px]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rec.icone}
                  alt=""
                  aria-hidden="true"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0"
                />
                <span className="font-bold tracking-wide truncate text-[#E2D6B6]">
                  {rec.nome}
                </span>
              </div>
              <span className={`font-bold tabular-nums ${rec.corValor} shrink-0`}>
                {rec.atual}/{rec.max}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-1 py-[1px]">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ATTRIBUTE_ICONS.sorte}
                alt=""
                aria-hidden="true"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0"
              />
              <span className="font-bold tracking-wide truncate text-[#E2D6B6]">Crítico</span>
            </div>
            <span className="font-bold tabular-nums text-[#C4B5FD] shrink-0">{chanceCritico}</span>
          </div>
        </div>

        {/* Linha divisória fina */}
        <div className="w-full h-px bg-[#B2A66C]/40 my-0.5 shrink-0" />

        {/* 7 Linhas de Atributos */}
        <div className="flex flex-col justify-around flex-[2.3]">
          {atributos.map((attr) => (
            <div
              key={attr.id}
              className="flex items-center justify-between gap-1 py-[1px]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attr.icone}
                  alt=""
                  aria-hidden="true"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0"
                />
                <span className="tracking-wide truncate text-[#F5F3E0]">
                  {attr.nome}
                </span>
              </div>
              <span className="font-bold text-[#F5C542] tabular-nums shrink-0">
                {attr.valor}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
