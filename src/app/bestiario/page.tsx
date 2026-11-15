'use client';

import React from 'react';
import { BestiarioScreen } from '@/components/bestiario/BestiarioScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function BestiarioPage() {
  const { character, loading } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary, color: colors.text.secondary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Carregando o Bestiário...</span>
      </main>
    );
  }
  return <BestiarioScreen personagem={character} />;
}
