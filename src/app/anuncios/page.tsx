'use client';

import React from 'react';
import { AnunciosScreen } from '@/components/anuncios/AnunciosScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function AnunciosPage() {
  const { character, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Carregando...</span>
      </main>
    );
  }
  return <AnunciosScreen tokenFresco={tokenFresco} />;
}
