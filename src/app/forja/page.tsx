'use client';

import React from 'react';
import { ForjaScreen } from '@/components/forja/ForjaScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function ForjaPage() {
  const { character, setCharacter, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Acendendo a forja...</span>
      </main>
    );
  }
  return <ForjaScreen character={character} onCharacterChange={setCharacter} tokenFresco={tokenFresco} />;
}
