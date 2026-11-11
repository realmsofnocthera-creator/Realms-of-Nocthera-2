'use client';

import React from 'react';
import Link from 'next/link';
import { FICHA_UI } from '@/assets/personagemUi';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { NotificationDot } from '@/components/NotificationDot';
import { CharacterDocument } from '@/server/characterService';

interface FichaBannerDesenvolvimentoProps {
  character?: CharacterDocument | null;
  className?: string;
}

const CONTORNO = '0.2cqw 0 0 #0B0610, -0.2cqw 0 0 #0B0610, 0 0.2cqw 0 #0B0610, 0 -0.2cqw 0 #0B0610';

/** O banner do Desenvolvimento de personagem (arte do Yuri, sem texto): o título e a frase são escritos em código. */
export function FichaBannerDesenvolvimento({ character, className = '' }: FichaBannerDesenvolvimentoProps) {
  const hasPoints = Boolean(character && character.pontosDisponiveis > 0);
  const t = TEXTOS_DA_FICHA.desenvolvimento;
  return (
    <Link href="/desenvolvimento" aria-label={t.titulo} className={`relative block mx-auto select-none cursor-pointer active:translate-y-px ${className}`} style={{ width: '62cqw', aspectRatio: '369 / 150' }}>
      <NotificationDot visible={hasPoints} className="top-1 right-3" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FICHA_UI.desenvolvimento} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
      <span className="absolute flex flex-col justify-center" style={{ left: '40%', right: '19%', top: '16%', bottom: '14%' }}>
        <span className="font-cinzel font-extrabold uppercase leading-tight text-[#EDB44C]" style={{ fontSize: '2.3cqw', textShadow: CONTORNO }}>{t.titulo}</span>
        <span className="font-cinzel leading-snug text-[#C9BFD9]" style={{ fontSize: '1.9cqw', textShadow: CONTORNO }}>{t.descricao}</span>
      </span>
    </Link>
  );
}
