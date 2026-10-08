'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { NOCTHERA_THEME } from '@/theme/theme';
import { HUD_ICONS } from '@/assets/hud';

export interface HudMenuProps {
  onNavigatePersonagem: () => void;
  onNavigateCombate: () => void;
  onNavigateProvacoes?: () => void;
  onNavigateMenu?: () => void;
}

export function HudMenu({
  onNavigatePersonagem,
  onNavigateCombate,
  onNavigateProvacoes,
  onNavigateMenu,
}: HudMenuProps) {
  const router = useRouter();
  const { colors } = NOCTHERA_THEME;

  const handleProvacoesClick = () => {
    if (onNavigateProvacoes) {
      onNavigateProvacoes();
    } else {
      router.push('/provacoes');
    }
  };

  const handleMenuClick = () => {
    if (onNavigateMenu) {
      onNavigateMenu();
    } else {
      router.push('/menu');
    }
  };

  const rightStackItems = [
    {
      id: 'historia',
      label: 'História',
      iconSrc: HUD_ICONS.menuHistoria,
      enabled: false,
      accentBorder: '#C8A656',
      bgGradient: 'linear-gradient(135deg, rgba(20,26,48,0.92) 0%, rgba(42,36,78,0.88) 100%)',
    },
    {
      id: 'combate',
      label: 'Arena',
      iconSrc: HUD_ICONS.menuArena,
      enabled: true,
      onClick: onNavigateCombate,
      accentBorder: colors.accent.primary,
      bgGradient: 'linear-gradient(135deg, rgba(45,12,16,0.94) 0%, rgba(92,20,28,0.90) 100%)',
    },
    {
      id: 'provacoes',
      label: 'Provações',
      iconSrc: HUD_ICONS.menuProvacoes,
      enabled: true,
      onClick: handleProvacoesClick,
      accentBorder: '#6B4CE6',
      bgGradient: 'linear-gradient(135deg, rgba(16,14,38,0.92) 0%, rgba(38,24,82,0.88) 100%)',
    },
  ] as const;

  const bottomDockItems = [
    {
      id: 'menu',
      label: 'Menu',
      iconSrc: HUD_ICONS.menuMenu,
      enabled: true,
      onClick: handleMenuClick,
    },
    {
      id: 'personagem',
      label: 'Personagem',
      iconSrc: HUD_ICONS.menuPersonagem,
      enabled: true,
      onClick: onNavigatePersonagem,
    },
    {
      id: 'loja',
      label: 'Loja',
      iconSrc: HUD_ICONS.menuLoja,
      enabled: false,
    },
    {
      id: 'guilda',
      label: 'Guilda',
      iconSrc: HUD_ICONS.menuGuilda,
      enabled: false,
    },
  ] as const;

  return (
    <nav
      aria-label="Menu principal do Hub"
      className="relative z-20 flex-1 w-full flex flex-col justify-between pointer-events-none select-none"
    >
      {/* FAIXA SUPERIOR SECUNDÁRIA: Passe de Batalha (esquerda) + Eventos / Temporada (direita) */}
      <div className="w-full flex items-start justify-between gap-1.5 px-2 sm:px-4 pt-1 sm:pt-1.5">
        {/* Esquerda abaixo do Perfil: Passe de Batalha (travado) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Passe de Batalha (Em breve)"
          aria-label="Passe de Batalha (Em breve)"
          className="pointer-events-auto relative flex items-center opacity-85 cursor-not-allowed group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.menuPasseBatalha}
            alt="Passe de Batalha"
            className="w-24 sm:w-36 md:w-40 h-auto object-contain drop-shadow-lg select-none pointer-events-none"
          />
          <span
            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center shadow"
            style={{
              backgroundColor: colors.background.primary,
              borderColor: `${colors.border.default}80`,
              color: colors.text.muted,
            }}
            aria-hidden="true"
          >
            <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </span>
        </button>

        {/* Direita abaixo das moedas: Eventos / Temporada (travados) */}
        <div className="pointer-events-auto flex items-center">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Eventos e Temporada (Em breve)"
            aria-label="Eventos e Temporada (Em breve)"
            className="relative flex items-center opacity-85 cursor-not-allowed"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HUD_ICONS.menuEventos}
              alt="Eventos e Temporada"
              className="w-32 sm:w-48 md:w-56 h-auto object-contain drop-shadow-lg select-none pointer-events-none"
            />
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center shadow"
              style={{
                backgroundColor: colors.background.primary,
                borderColor: `${colors.border.default}80`,
                color: colors.text.muted,
              }}
              aria-hidden="true"
            >
              <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            </span>
          </button>
        </div>
      </div>

      {/* ZONA INFERIOR: Coluna direita (História, Arena, Provações) + Barra inferior esquerda (Menu, Personagem, Loja, Guilda) */}
      <div className="w-full flex flex-col items-end justify-end mt-auto">
        {/* Coluna Direita: História, Arena (Ativo -> /combate), Provações */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 sm:gap-2 pr-2 sm:pr-4 mb-2 sm:mb-3">
          {rightStackItems.map((item) => {
            if (item.enabled) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="group relative w-28 sm:w-40 md:w-48 h-9 sm:h-12 md:h-14 rounded-md sm:rounded-lg border sm:border-2 overflow-hidden flex items-center justify-between px-2 sm:px-3.5 shadow-xl transition-transform duration-150 cursor-pointer hover:scale-[1.03] active:scale-[0.98] -skew-x-6"
                  style={{
                    background: item.bgGradient,
                    borderColor: item.accentBorder,
                    color: colors.text.primary,
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 z-10 skew-x-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain drop-shadow select-none pointer-events-none"
                    />
                    <span className="font-cinzel font-extrabold text-xs sm:text-base md:text-lg tracking-wide drop-shadow">
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                disabled
                aria-disabled="true"
                title="Em breve"
                className="relative w-28 sm:w-40 md:w-48 h-9 sm:h-12 md:h-14 rounded-md sm:rounded-lg border overflow-hidden flex items-center justify-between px-2 sm:px-3.5 shadow-lg opacity-75 cursor-not-allowed -skew-x-6"
                style={{
                  background: item.bgGradient,
                  borderColor: `${item.accentBorder}88`,
                  color: colors.text.primary,
                }}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 z-10 skew-x-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.iconSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain opacity-85 select-none pointer-events-none"
                  />
                  <span className="font-cinzel font-bold text-xs sm:text-base md:text-lg tracking-wide drop-shadow">
                    {item.label}
                  </span>
                </div>

                <span
                  className="z-10 skew-x-6 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: colors.background.primary,
                    borderColor: `${colors.border.default}80`,
                    color: colors.text.muted,
                  }}
                  aria-hidden="true"
                >
                  <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Barra Inferior Esquerda: Menu, Personagem (Ativo -> /personagem), Loja, Guilda */}
        <div className="w-full flex items-end justify-start">
          <div
            className="pointer-events-auto flex items-end gap-0.5 sm:gap-1.5 px-1.5 sm:px-3.5 py-1 sm:py-2 rounded-tr-xl sm:rounded-tr-2xl border-t border-r backdrop-blur-md shadow-2xl"
            style={{
              background:
                'linear-gradient(90deg, rgba(13,13,13,0.95) 0%, rgba(18,15,12,0.92) 85%, rgba(18,15,12,0.45) 100%)',
              borderColor: `${colors.border.default}80`,
            }}
          >
            {bottomDockItems.map((item) => {
              if (item.enabled) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="group relative flex flex-col items-center justify-end px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-transform duration-150 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <div className="relative w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.iconSrc}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-contain drop-shadow select-none pointer-events-none"
                      />
                    </div>
                    <span
                      className="mt-0.5 font-cinzel font-bold text-[9px] sm:text-[11px] leading-none tracking-wide"
                      style={{ color: colors.text.primary }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Em breve"
                  className="relative flex flex-col items-center justify-end px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md opacity-65 cursor-not-allowed"
                >
                  <div className="relative w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.iconSrc}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-contain select-none pointer-events-none"
                    />
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border flex items-center justify-center"
                      style={{
                        backgroundColor: colors.background.primary,
                        borderColor: `${colors.border.default}80`,
                        color: colors.text.muted,
                      }}
                      aria-hidden="true"
                    >
                      <Lock className="w-2 h-2" />
                    </span>
                  </div>
                  <span
                    className="mt-0.5 font-cinzel font-semibold text-[9px] sm:text-[11px] leading-none tracking-wide"
                    style={{ color: colors.text.secondary }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
