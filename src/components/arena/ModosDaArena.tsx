'use client';

import React from 'react';
import Link from 'next/link';
import { ARENA_UI, POSICAO } from '@/assets/arenaUi';
import { PalcoPixel, Peca, Texto, pixel, u } from '@/components/pixel/GradePixel';
import { TEXTOS_DA_ARENA as T } from '@/rules/textosDaArenaTela';
import { CREME, SUB } from './PecasDaArena';

export type ModoEscolhido = 'arena' | 'ranqueada' | 'campeonato';
const CARTOES: readonly { id: ModoEscolhido; arte: string; rect: { x: number; y: number; l: number; a: number } }[] = [
  { id: 'arena', arte: ARENA_UI.modoArena, rect: POSICAO.modos.arena },
  { id: 'ranqueada', arte: ARENA_UI.modoRanqueada, rect: POSICAO.modos.ranqueada },
  { id: 'campeonato', arte: ARENA_UI.modoCampeonato, rect: POSICAO.modos.campeonato },
];

/** A seleção de modo da Arena: os três cartões do Yuri (Arena, Ranqueada e Campeonato). */
export function ModosDaArena({ aoEscolher, aoAbrirRegras }: { aoEscolher: (m: ModoEscolhido) => void; aoAbrirRegras: () => void }) {
  return (
    <PalcoPixel fundo={ARENA_UI.fundoColiseu}>
      <Peca src={ARENA_UI.titulo} p={POSICAO.titulo}>
        <Texto x={100} y={48} tamanho={11} caixaAlta largura={150} cor="#2A1A0E">{T.titulo}</Texto>
      </Peca>
      <Link href="/hub" aria-label={T.voltar} className="absolute active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${ARENA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      <button type="button" onClick={aoAbrirRegras} aria-label={T.regras} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.livro.x), top: u(POSICAO.livro.y), width: u(POSICAO.livro.l), height: u(POSICAO.livro.a), backgroundImage: `url(${ARENA_UI.livro})`, backgroundSize: '100% 100%', ...pixel }} />
      <Texto x={180} y={78} tamanho={6.4} cor={SUB} negrito={false} caixaAlta largura={300}>{T.escolhaOModo}</Texto>
      {CARTOES.map(({ id, arte, rect }) => (
        <button key={id} type="button" data-tutorial={`arena-modo-${id}`} onClick={() => aoEscolher(id)} aria-label={T.modos[id].nome} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(rect.x), top: u(rect.y), width: u(rect.l), height: u(rect.a), backgroundImage: `url(${arte})`, backgroundSize: '100% 100%', ...pixel }}>
          <Texto x={257} y={33} tamanho={12} caixaAlta largura={92} cor={CREME}>{T.modos[id].nome}</Texto>
          <Texto x={213} y={77} tamanho={5.2} caixaAlta largura={76} alinhar="left" cor={SUB} negrito={false}>{T.modos[id].sub}</Texto>
        </button>
      ))}
    </PalcoPixel>
  );
}
