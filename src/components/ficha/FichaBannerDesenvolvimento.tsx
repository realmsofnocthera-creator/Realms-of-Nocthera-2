'use client';

import React from 'react';
import Link from 'next/link';
import { FICHA_ASSETS } from '@/rules/fichaAssets';
import { NotificationDot } from '@/components/NotificationDot';
import { CharacterDocument } from '@/server/characterService';

interface FichaBannerDesenvolvimentoProps {
  character?: CharacterDocument | null;
  className?: string;
}

export function FichaBannerDesenvolvimento({
  character,
  className = '',
}: FichaBannerDesenvolvimentoProps) {
  const hasPoints = Boolean(character && character.pontosDisponiveis > 0);

  return (
    <Link
      href="/desenvolvimento"
      aria-label="Desenvolvimento de personagem"
      className={`relative w-full max-w-xl mx-auto select-none cursor-pointer opacity-95 hover:opacity-100 transition-all flex items-center justify-center shrink-0 group active:scale-[0.99] ${className}`}
    >
      <NotificationDot
        visible={hasPoints}
        className="top-1 sm:top-2 right-4 sm:right-8"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={FICHA_ASSETS.bannerDesenvolvimento}
        alt="Desenvolvimento de personagem"
        className="w-full h-auto max-h-20 sm:max-h-24 md:max-h-28 object-contain pointer-events-none select-none block drop-shadow-2xl group-hover:brightness-110 transition-all"
      />
    </Link>
  );
}
