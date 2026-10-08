'use client';

import React from 'react';
import { FICHA_ASSETS } from '@/rules/fichaAssets';

interface FichaSidebarProps {
  className?: string;
}

export function FichaSidebar({ className = '' }: FichaSidebarProps) {
  const buttons = [
    {
      id: 'personagem',
      label: 'Personagem',
      src: FICHA_ASSETS.btnPersonagem,
      active: true,
      invert: true,
    },
    {
      id: 'equipamentos',
      label: 'Equipamentos',
      src: FICHA_ASSETS.btnEquipamentos,
      active: false,
      invert: false,
    },
    {
      id: 'emblemas',
      label: 'Emblemas',
      src: FICHA_ASSETS.btnEmblemas,
      active: false,
      invert: true,
    },
    {
      id: 'alma',
      label: 'Alma',
      src: FICHA_ASSETS.btnAlma,
      active: false,
      invert: true,
    },
  ];

  return (
    <nav
      aria-label="Navegação da Ficha"
      className={`flex flex-col gap-2 sm:gap-2.5 shrink-0 z-20 ${className}`}
    >
      {buttons.map((btn) => {
        if (btn.active) {
          return (
            <button
              key={btn.id}
              type="button"
              aria-label={btn.label}
              aria-current="page"
              className="relative w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] rounded-lg p-1.5 flex items-center justify-center border-2 border-[#ED8A0C] shadow-[0_0_12px_rgba(237,138,12,0.65)] ring-1 ring-[#ED8A0C] cursor-default transition-all"
              style={{
                backgroundColor: 'rgba(13,13,13,0.85)',
                isolation: 'isolate',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={btn.src}
                alt={btn.label}
                className="w-full h-full object-contain pointer-events-none select-none"
                style={{
                  filter: btn.invert ? 'invert(1)' : undefined,
                  mixBlendMode: 'screen',
                }}
              />
            </button>
          );
        }

        return (
          <div
            key={btn.id}
            role="button"
            aria-label={btn.label}
            aria-disabled="true"
            tabIndex={-1}
            className="relative w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px] rounded-lg p-1.5 flex items-center justify-center border border-[#B2A66C]/40 opacity-70 cursor-not-allowed select-none"
            style={{
              backgroundColor: 'rgba(13,13,13,0.85)',
              isolation: 'isolate',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={btn.src}
              alt={btn.label}
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{
                filter: btn.invert ? 'invert(1)' : undefined,
                mixBlendMode: 'screen',
              }}
            />
          </div>
        );
      })}
    </nav>
  );
}
