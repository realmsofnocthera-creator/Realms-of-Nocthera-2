'use client';

import React from 'react';
import { NOCTHERA_THEME } from '../theme/theme';

export interface NotificationDotProps {
  visible: boolean;
  className?: string;
  'aria-label'?: string;
}

export function NotificationDot({
  visible,
  className = '',
  'aria-label': ariaLabel = 'Novos pontos ou notificações disponíveis',
}: NotificationDotProps) {
  if (!visible) {
    return null;
  }

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`absolute z-10 flex h-3 w-3 items-center justify-center ${className}`}
    >
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: NOCTHERA_THEME.colors.notificationDot }}
      />
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full shadow-sm animate-pulse"
        style={{ backgroundColor: NOCTHERA_THEME.colors.notificationDot }}
      />
    </span>
  );
}
