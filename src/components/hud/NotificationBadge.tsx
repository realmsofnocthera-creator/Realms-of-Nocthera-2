'use client';

import React from 'react';
import { HUD_ICONS } from '@/assets/hud';
import { NOCTHERA_THEME } from '@/theme/theme';

export interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const { colors } = NOCTHERA_THEME;

  return (
    <span
      aria-label="Notificação pendente"
      className={`absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center pointer-events-none select-none shadow-md ${className}`}
      style={{
        backgroundColor: colors.background.primary,
        borderColor: colors.border.active,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HUD_ICONS.notificacao}
        alt=""
        aria-hidden="true"
        className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain select-none pointer-events-none"
      />
    </span>
  );
}
