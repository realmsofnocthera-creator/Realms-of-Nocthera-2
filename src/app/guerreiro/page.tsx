'use client';

import React from 'react';
import { GuerreiroScreen } from '@/components/guerreiro/GuerreiroScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function GuerreiroPage() {
  const { character, setCharacter, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary, color: colors.text.secondary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Carregando a Provação do Guerreiro...</span>
      </main>
    );
  }
  return <GuerreiroScreen character={character} onCharacterChange={setCharacter} tokenFresco={tokenFresco} />;
}
