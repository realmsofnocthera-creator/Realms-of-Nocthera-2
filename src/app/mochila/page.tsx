'use client';

import React from 'react';
import { MochilaScreen } from '@/components/mochila/MochilaScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function MochilaPage() {
  const { character, loading } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Abrindo a mochila...</span>
      </main>
    );
  }
  return <MochilaScreen character={character} />;
}
