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

/**
 * A entrada do Desenvolvimento de personagem: o emblema do Yuri (setas azuis sobre a silhueta) com o título e a frase
 * escritos em código. O ponto de aviso aparece quando há pontos para distribuir.
 */
export function FichaBannerDesenvolvimento({ character, className = '' }: FichaBannerDesenvolvimentoProps) {
  const hasPoints = Boolean(character && character.pontosDisponiveis > 0);
  const t = TEXTOS_DA_FICHA.desenvolvimento;
  return (
    <Link href="/desenvolvimento" aria-label={t.titulo} className={`relative flex items-center justify-center gap-[2.4cqw] mx-auto select-none cursor-pointer active:translate-y-px ${className}`} style={{ width: '88cqw' }}>
      <span className="relative block shrink-0" style={{ width: '24cqw', aspectRatio: '480 / 394' }}>
        <NotificationDot visible={hasPoints} className="top-0 right-0" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FICHA_UI.desenvolvimento} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 1.6cqw rgba(60,160,255,0.55))' }} />
      </span>
      <span className="flex flex-col min-w-0" style={{ maxWidth: '58cqw' }}>
        <span className="font-cinzel font-extrabold uppercase leading-tight text-[#EDB44C]" style={{ fontSize: '3.2cqw', textShadow: CONTORNO }}>{t.titulo}</span>
        <span className="font-cinzel leading-snug text-[#C9D6EA]" style={{ fontSize: '2.4cqw', textShadow: CONTORNO }}>{t.descricao}</span>
      </span>
    </Link>
  );
}
