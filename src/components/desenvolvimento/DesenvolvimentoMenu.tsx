'use client';

import React from 'react';
import {
  DESENVOLVIMENTO_MENU,
  DesenvolvimentoMenuItem,
  DesenvolvimentoSecaoId,
} from '@/rules/desenvolvimentoMenu';
import { NotificationDot } from '@/components/NotificationDot';
import { NOCTHERA_THEME } from '@/theme/theme';

interface DesenvolvimentoMenuProps {
  secaoAtiva: DesenvolvimentoSecaoId;
  onSelectSecao: (id: DesenvolvimentoSecaoId) => void;
  pontosDisponiveis: number;
  className?: string;
}

export function DesenvolvimentoMenu({
  secaoAtiva,
  onSelectSecao,
  pontosDisponiveis,
  className = '',
}: DesenvolvimentoMenuProps) {
  const { colors } = NOCTHERA_THEME;

  return (
    <nav
      aria-label="Menu de Desenvolvimento"
      className={`relative w-[84px] h-full flex flex-col justify-between items-center select-none py-1 ${className}`}
    >
      {/* Linha vertical dourada decorativa de conexão (z-0, estritamente atrás dos ícones e rótulos) */}
      <div
        aria-hidden="true"
        className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-0.5 pointer-events-none z-0"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${colors.border.default}66 15%, ${colors.accent.primary} 50%, ${colors.border.default}66 85%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 flex flex-col justify-between items-center h-full w-full">
        {DESENVOLVIMENTO_MENU.map((item: DesenvolvimentoMenuItem, idx) => {
          const isAtivo = secaoAtiva === item.id;
          const isDisponivel = item.disponivel;

          return (
            <div key={item.id} className="relative flex flex-col items-center w-full group">
              {/* Losango conector no topo de cada item (exceto o primeiro) */}
              {idx > 0 && (
                <div
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rotate-45 -mt-1 mb-0.5 pointer-events-none z-0"
                  style={{
                    backgroundColor: isAtivo ? colors.accent.primary : colors.border.default,
                    boxShadow: isAtivo ? `0 0 4px ${colors.accent.primary}` : 'none',
                  }}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  if (isDisponivel) {
                    onSelectSecao(item.id);
                  }
                }}
                disabled={!isDisponivel}
                aria-current={isAtivo ? 'page' : undefined}
                className={`relative z-20 flex flex-col items-center text-center w-full transition-all ${
                  isDisponivel
                    ? 'cursor-pointer active:scale-95'
                    : 'cursor-not-allowed opacity-45'
                }`}
              >
                {/* Notificação no item de atributos */}
                {item.id === 'atributos' && (
                  <NotificationDot
                    visible={pontosDisponiveis > 0}
                    className="top-0 right-3 z-30"
                  />
                )}

                {/* Ícone com borda circular (~36-38px) e fundo opaco para isolar da linha de fundo */}
                <div
                  className={`relative z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center p-0.5 transition-all ${
                    isAtivo ? 'scale-105' : 'hover:scale-100'
                  }`}
                  style={{
                    backgroundColor: isAtivo ? colors.background.cardElevated : colors.background.card,
                    border: `1.5px solid ${isAtivo ? colors.accent.primary : `${colors.border.default}66`}`,
                    boxShadow: isAtivo
                      ? `0 0 10px ${colors.accent.primary}88, inset 0 0 6px ${colors.accent.primary}55`
                      : '0 2px 4px rgba(0,0,0,0.7)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.icone}
                    alt=""
                    aria-hidden="true"
                    className={`w-full h-full object-contain pointer-events-none select-none drop-shadow ${
                      isAtivo ? 'brightness-110' : 'brightness-90'
                    }`}
                  />
                </div>

                {/* Rótulo com fundo escuro semitransparente próprio e z-20 (nunca cruzado pela linha) */}
                <span
                  className={`relative z-20 mt-0.5 text-[9.5px] leading-tight max-w-[80px] tracking-tight font-cinzel px-1 py-0.2 rounded text-center backdrop-blur-xs ${
                    isAtivo ? 'font-black' : 'font-bold'
                  }`}
                  style={{
                    backgroundColor: isAtivo ? `${colors.background.cardElevated}f5` : `${colors.background.primary}ee`,
                    border: `1px solid ${isAtivo ? `${colors.accent.primary}88` : `${colors.border.default}22`}`,
                    color: isAtivo ? colors.accent.primary : colors.text.primary,
                    textShadow: '0 1px 2px rgba(0,0,0,0.95)',
                  }}
                >
                  {item.label}
                </span>

                {/* Badge "Em breve" para itens bloqueados */}
                {!isDisponivel && (
                  <span
                    className="relative z-20 -mt-0.5 text-[7.5px] uppercase tracking-wider px-1 py-0.2 rounded font-semibold italic"
                    style={{
                      backgroundColor: `${colors.background.secondary}f5`,
                      border: `1px solid ${colors.border.default}33`,
                      color: colors.text.muted,
                      textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                    }}
                  >
                    Em breve
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
