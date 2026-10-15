'use client';

import React from 'react';
import { MestrePainel } from '@/components/mestre/MestrePainel';
import { TelaDeAcesso, useSessaoDoMestre } from '@/components/mestre/acessoDoMestre';

/** /mestre: só entra quem tem papel; o servidor decide (a tela apenas mostra o resultado). */
export default function MestrePage() {
  const { estado, tokenFresco } = useSessaoDoMestre();
  if (estado.tipo === 'ok') return <MestrePainel sessao={estado.sessao} tokenFresco={tokenFresco} />;
  return <TelaDeAcesso estado={estado} />;
}
