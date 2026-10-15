'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { EditorDeMapa } from '@/components/mestre/EditorDeMapa';
import { TelaDeAcesso, useSessaoDoMestre } from '@/components/mestre/acessoDoMestre';

/** /mestre/mapas/[id]: o editor de mapas, com o mesmo controle de acesso do painel (o servidor decide). */
export default function EditorDeMapaPage() {
  const { estado, tokenFresco } = useSessaoDoMestre();
  const { id } = useParams<{ id: string }>();
  if (estado.tipo !== 'ok') return <TelaDeAcesso estado={estado} />;
  return <EditorDeMapa id={id} sessao={estado.sessao} tokenFresco={tokenFresco} />;
}
