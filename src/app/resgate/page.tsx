'use client';

import React from 'react';
import { ResgateScreen } from '@/components/resgate/ResgateScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function ResgatePage() {
  const { character, loading, tokenFresco } = usePersonagemLogado();
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Abrindo o Resgate...</span>
      </main>
    );
  }
  return <ResgateScreen tokenFresco={tokenFresco} />;
}
