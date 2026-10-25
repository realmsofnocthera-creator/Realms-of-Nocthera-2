'use client';

import React from 'react';
import { MercadoScreen } from '@/components/mercado/MercadoScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function MercadoPage() {
  const { character, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Carregando...</span>
      </main>
    );
  }
  return <MercadoScreen tokenFresco={tokenFresco} />;
}
