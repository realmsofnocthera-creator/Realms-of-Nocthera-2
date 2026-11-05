'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { NOCTHERA_THEME } from '@/theme/theme';
import { HUD_ICONS } from '@/assets/hud';
import { useAvisos } from '@/lib/useAvisos';
import { NotificationBadge } from './NotificationBadge';

export interface HudMenuProps {
  onNavigatePersonagem: () => void;
  onNavigateCombate: () => void;
  onNavigateProvacoes?: () => void;
  onNavigateMenu?: () => void;
  onNavigateHistoria?: () => void;
}

export function HudMenu({
  onNavigatePersonagem,
  onNavigateCombate,
  onNavigateProvacoes,
  onNavigateMenu,
  onNavigateHistoria,
}: HudMenuProps) {
  const router = useRouter();
  const { colors } = NOCTHERA_THEME;
  // Pontos de aviso: baú de missões, expedição pronta (Provações) e recompensa do Chefe de guildas (Guilda)
  const avisos = useAvisos();
  const pontoDe = (id: string) => (id === 'provacoes' ? avisos.expedicao : id === 'guilda' ? avisos.guilda : false);

  const handleProvacoesClick = () => {
    if (onNavigateProvacoes) {
      onNavigateProvacoes();
    } else {
      router.push('/provacoes');
    }
  };

  const handleHistoriaClick = () => {
    if (onNavigateHistoria) {
      onNavigateHistoria();
    } else {
      router.push('/campanha');
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
      enabled: true,
      onClick: handleHistoriaClick,
      caixa: 'caixa-pixel-arcana',
    },
    {
      id: 'combate',
      label: 'Arena',
      iconSrc: HUD_ICONS.menuArena,
      enabled: true,
      onClick: onNavigateCombate,
      caixa: 'caixa-pixel-ardente',
    },
    {
      id: 'provacoes',
      label: 'Provações',
      iconSrc: HUD_ICONS.menuProvacoes,
      enabled: true,
      onClick: handleProvacoesClick,
      caixa: '',
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
      enabled: true,
      onClick: () => router.push('/loja'),
    },
    {
      id: 'guilda',
      label: 'Guilda',
      iconSrc: HUD_ICONS.menuGuilda,
      enabled: true,
      onClick: () => router.push('/guilda'),
    },
  ] as const;

  return (
    <nav
      aria-label="Menu principal do Hub"
      className="relative z-20 flex-1 w-full flex flex-col justify-between pointer-events-none select-none"
    >
      {/* FAIXA SUPERIOR SECUNDÁRIA: Passe de Batalha (esquerda) + Eventos / Temporada (direita) */}
      <div className="w-full flex items-start justify-between gap-1.5 px-2 sm:px-4 pt-1 sm:pt-1.5">
        {/* Esquerda abaixo do Perfil: Passe de Temporada (travado; Nv 0/60 até o sistema existir) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Passe de Temporada (Em breve)"
          aria-label="Passe de Temporada 0, nível 0 de 60 (Em breve)"
          className="caixa-pixel pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-2 py-1 opacity-90 cursor-not-allowed"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.menuPasseBatalha}
            alt=""
            aria-hidden="true"
            className="w-8 h-6 sm:w-10 sm:h-7 object-contain select-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="flex flex-col items-start gap-1">
            <span className="font-[family-name:var(--font-pixel)] text-[6px] sm:text-[8px] leading-none uppercase text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
              Passe de Temporada 0
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-[family-name:var(--font-silk)] text-[9px] sm:text-[11px] leading-none text-[#E2D6B6]">Nv 0/60</span>
              <Lock className="w-2.5 h-2.5 text-[#B2A66C]" aria-hidden="true" />
            </span>
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
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`caixa-pixel ${item.caixa} group relative w-[7.5rem] sm:w-44 md:w-52 h-10 sm:h-12 md:h-14 flex items-center px-2 sm:px-3 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 z-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.iconSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain drop-shadow select-none pointer-events-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="font-[family-name:var(--font-pixel)] text-[8px] sm:text-[11px] md:text-[12px] leading-none uppercase text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
                    {item.label}
                  </span>
                </div>
                {pontoDe(item.id) && <NotificationBadge />}
              </button>
            );
          })}
        </div>

        {/* Missões diárias e semanais e Check-in, logo acima da barra do Menu (o ponto aparece com baú pronto ou check-in por fazer) */}
        <div className="w-full flex items-end justify-start px-2 sm:px-4 mb-1 sm:mb-1.5">
          <button
            type="button"
            onClick={() => router.push('/missoes')}
            aria-label={avisos.missoes || avisos.checkin ? 'Missões (há algo para resgatar)' : 'Missões'}
            className="caixa-pixel pointer-events-auto relative flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-3 py-1 cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HUD_ICONS.menuMissoes}
              alt=""
              aria-hidden="true"
              className="w-7 h-7 sm:w-9 sm:h-9 object-contain select-none pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="font-[family-name:var(--font-pixel)] text-[8px] sm:text-[10px] leading-none uppercase text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
              Missões
            </span>
            {(avisos.missoes > 0 || avisos.checkin) && <NotificationBadge />}
          </button>
        </div>

        {/* Barra Inferior Esquerda: Menu, Personagem (Ativo -> /personagem), Loja, Guilda */}
        <div className="w-full flex items-end justify-start">
          <div className="pilula-pixel pointer-events-auto ml-1 sm:ml-2 mb-1 flex items-end gap-0.5 sm:gap-1.5 px-1.5 sm:px-3.5 py-1 sm:py-2">
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
                      {pontoDe(item.id) && <NotificationBadge />}
                    </div>
                    <span className="mt-0.5 font-[family-name:var(--font-silk)] font-bold text-[9px] sm:text-[11px] leading-none text-[#F5E3B3] [text-shadow:1px_1px_0_#1A120B]">
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
