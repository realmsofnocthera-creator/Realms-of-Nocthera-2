'use client';

import React, { useState } from 'react';
import { ARENA_UI, INSIGNIA_DO_RANQUE, POSICAO } from '@/assets/arenaUi';
import { PalcoPixel, Peca, Texto, pixel, u } from '@/components/pixel/GradePixel';
import { RANQUES } from '@/rules/arenaRanqueada';
import { TEXTOS_DA_ARENA as T } from '@/rules/textosDaArenaTela';
import { TITULO_MAP } from '@/rules/titulos';
import { CREME, DOURADO, SUB } from './PecasDaArena';

/** A recompensa de fim de semana de cada ranque (do que você tem ao lado, as setas passam de um ranque para outro). */
export function RecompensasDaRanqueada({ ranqueInicial, aoVoltar }: { ranqueInicial: number; aoVoltar: () => void }) {
  const [i, setI] = useState(Math.min(RANQUES.length - 1, Math.max(0, ranqueInicial)));
  const r = RANQUES[i];
  const selos = Object.entries(r.selos).map(([s, n]) => `${n} ${T.seloNome[s] ?? s}`).join(' · ');
  const tituloDoRanque = TITULO_MAP[r.titulo]?.nome ?? r.titulo;
  const linhas: { icone: string; l: number; a: number; rotulo: string; valor: string }[] = [
    { icone: ARENA_UI.moeda, l: 16, a: 16, rotulo: T.ouro, valor: r.ouro.toLocaleString('pt-BR') },
    { icone: ARENA_UI.diamante, l: 18, a: 14, rotulo: T.diamantes, valor: String(r.diamantes) },
    { icone: ARENA_UI.selo, l: 18, a: 17, rotulo: T.selosDeBusca, valor: selos || '—' },
    { icone: ARENA_UI.louros, l: 18, a: 15, rotulo: T.tituloDoRanque, valor: tituloDoRanque },
  ];
  const seta = (dx: -1 | 1, x: number) => (
    <button type="button" onClick={() => setI((v) => Math.min(RANQUES.length - 1, Math.max(0, v + dx)))} disabled={dx < 0 ? i === 0 : i === RANQUES.length - 1} aria-label={dx < 0 ? 'Ranque anterior' : 'Próximo ranque'}
      className="absolute font-cinzel font-black cursor-pointer disabled:opacity-30" style={{ left: u(x), top: u(92), width: u(28), height: u(40), fontSize: u(22), color: DOURADO, textShadow: '0 1px 0 #000, 0 0 4px #000' }}>{dx < 0 ? '‹' : '›'}</button>
  );
  return (
    <PalcoPixel fundo={ARENA_UI.fundoTorre}>
      <Peca src={ARENA_UI.titulo} p={POSICAO.titulo}>
        <Texto x={100} y={48} tamanho={9.4} caixaAlta largura={150} cor="#2A1A0E">{T.recompensas}</Texto>
      </Peca>
      <button type="button" onClick={aoVoltar} aria-label={T.voltar} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${ARENA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      {seta(-1, 24)}
      {seta(1, 308)}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={INSIGNIA_DO_RANQUE(i, 'g')} alt={r.nome} draggable={false} className="absolute" style={{ left: u(180 - 43), top: u(112 - 50), width: u(86), height: 'auto', ...pixel }} />
      <Texto x={180} y={176} tamanho={9} caixaAlta largura={200} cor={DOURADO}>{r.nome}</Texto>
      <Texto x={180} y={188} tamanho={4.8} caixaAlta largura={300} cor={SUB} negrito={false}>{T.recompensaDeFimDeSemana}</Texto>
      <Peca src={ARENA_UI.recompensas} p={{ x: 105, y: 199, l: 150, a: 81 }}>
        {linhas.map((l, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={k} src={l.icone} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(28 + k * 31.5 - l.l / 2), top: u(46 - l.a / 2), width: u(l.l), height: u(l.a), ...pixel }} />
        ))}
      </Peca>
      {linhas.map((l, k) => {
        const y = 298 + k * 22;
        return (
          <React.Fragment key={l.rotulo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.icone} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(40), top: u(y - l.a / 2), width: u(l.l), height: u(l.a), ...pixel }} />
            <Texto x={66} y={y} tamanho={6.6} alinhar="left" largura={110} cor={CREME}>{l.rotulo}</Texto>
            <Texto x={322} y={y} tamanho={6.4} alinhar="right" largura={140} cor={DOURADO}>{l.valor}</Texto>
          </React.Fragment>
        );
      })}
      {r.bauDeCartaLendaria && (
        <>
          <Peca src={ARENA_UI.bauFechado} p={{ x: 70, y: 384, l: 44, a: 41 }} />
          <Texto x={122} y={398} tamanho={6.2} alinhar="left" largura={190} cor={CREME}>{T.bauLendario}</Texto>
          <Texto x={122} y={410} tamanho={4.8} alinhar="left" largura={190} cor={SUB} negrito={false}>{T.bauAparece}</Texto>
        </>
      )}
    </PalcoPixel>
  );
}
