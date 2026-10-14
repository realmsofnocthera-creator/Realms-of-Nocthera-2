'use client';

import React from 'react';
import { TorreCelestialScreen } from '@/components/torreCelestial/TorreCelestialScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function TorreCelestialPage() {
  const { character, setCharacter, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary, color: colors.text.secondary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Carregando a Torre Celestial...</span>
      </main>
    );
  }
  return <TorreCelestialScreen character={character} onCharacterChange={setCharacter} tokenFresco={tokenFresco} />;
}
