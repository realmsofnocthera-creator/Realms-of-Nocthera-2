'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { JogarMapa } from '@/components/mestre/JogarMapa';
import { TelaDeAcesso, useSessaoDoMestre } from '@/components/mestre/acessoDoMestre';

/** /mestre/mapas/[id]/jogar: o Mestre testa o rascunho do mapa andando por ele (3.5.6.6). Mesmo controle de acesso do painel. */
export default function JogarMapaPage() {
  const { estado, tokenFresco } = useSessaoDoMestre();
  const { id } = useParams<{ id: string }>();
  if (estado.tipo !== 'ok') return <TelaDeAcesso estado={estado} />;
  if (!estado.sessao.permissoes.includes('conteudo.ler')) return <TelaDeAcesso estado={{ tipo: 'erro', mensagem: 'Seu papel não pode abrir mapas.' }} />;
  return <JogarMapa id={id} tokenFresco={tokenFresco} />;
}
