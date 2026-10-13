'use client';

import React from 'react';
import { ArmaduraScreen } from '@/components/forja/ArmaduraScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function ArmadurasPage() {
  const { character, setCharacter, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Abrindo o arsenal...</span>
      </main>
    );
  }
  return <ArmaduraScreen character={character} onCharacterChange={setCharacter} tokenFresco={tokenFresco} />;
}
