'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Uma animação em folha de quadros (todos lado a lado, mesmo tamanho): o arquivo, quantos quadros e quanto cada um dura (ms). */
export interface FolhaDeQuadros {
  src: string;
  quadros: number;
  ms: readonly number[];
}

/** Onde o quadro `i` fica na folha (em % da largura, para o `background-position`). */
export function posicaoDoQuadroNaFolha(i: number, quadros: number): number {
  return quadros > 1 ? (i / (quadros - 1)) * 100 : 0;
}

/**
 * Um personagem animado em pixel: fica na animação parada (`parado`, em repetição) e, cada vez que `golpe` muda para um
 * número novo, toca a de ataque uma vez e volta ao parado. `velocidade` acelera (2 = o dobro) ou desacelera (0,5 = câmera
 * lenta). Com "reduzir movimento" ligado, fica no primeiro quadro do parado e o ataque não toca.
 */
export function SpriteAnimado({ parado, ataque, golpe, velocidade = 1, espelhado = false, rotulo, reacao, reagir = null }: { parado: FolhaDeQuadros; ataque: FolhaDeQuadros; golpe: number | null; velocidade?: number; espelhado?: boolean; rotulo: string; /** a animação de quem leva um golpe (opcional) */ reacao?: FolhaDeQuadros; /** muda para um número novo a cada golpe levado, e toca a `reacao` uma vez */ reagir?: number | null }) {
  const [folha, setFolha] = useState<'parado' | 'ataque' | 'reacao'>('parado');
  const [quadro, setQuadro] = useState(0);
  const velocidadeAtual = useRef(velocidade);
  velocidadeAtual.current = velocidade;
  const reduzir = useRef(false);

  useEffect(() => {
    reduzir.current = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // as folhas já ficam baixadas antes do primeiro golpe
    for (const f of [parado, ataque]) {
      const img = new Image();
      img.src = f.src;
    }
  }, [parado, ataque]);

  // o parado: um quadro depois do outro, sem parar
  useEffect(() => {
    if (folha !== 'parado' || reduzir.current) return;
    let i = 0;
    let t: number;
    const passo = () => {
      setQuadro(i);
      t = window.setTimeout(() => {
        i = (i + 1) % parado.quadros;
        passo();
      }, parado.ms[i] / velocidadeAtual.current);
    };
    passo();
    return () => window.clearTimeout(t);
  }, [folha, parado]);

  // o ataque: toca uma vez e volta ao parado
  useEffect(() => {
    if (golpe === null || reduzir.current) return;
    setFolha('ataque');
    let i = 0;
    let t: number;
    const passo = () => {
      setQuadro(i);
      t = window.setTimeout(() => {
        i += 1;
        if (i >= ataque.quadros) setFolha('parado');
        else passo();
      }, ataque.ms[i] / velocidadeAtual.current);
    };
    passo();
    return () => window.clearTimeout(t);
  }, [golpe, ataque]);

  // a reação ao golpe: toca uma vez e volta ao parado (não interrompe um ataque que está tocando)
  const folhaAgora = useRef(folha);
  folhaAgora.current = folha;
  useEffect(() => {
    if (reagir === null || !reacao || reduzir.current || folhaAgora.current === 'ataque') return;
    setFolha('reacao');
    let i = 0;
    let t: number;
    const passo = () => {
      setQuadro(i);
      t = window.setTimeout(() => {
        i += 1;
        if (i >= reacao.quadros) setFolha((f) => (f === 'reacao' ? 'parado' : f));
        else passo();
      }, reacao.ms[i] / velocidadeAtual.current);
    };
    passo();
    return () => window.clearTimeout(t);
  }, [reagir, reacao]);

  const atual = folha === 'ataque' ? ataque : folha === 'reacao' && reacao ? reacao : parado;
  return (
    <div
      role="img"
      aria-label={rotulo}
      className="w-full h-full"
      data-folha={folha}
      data-quadro={quadro}
      style={{
        backgroundImage: `url(${atual.src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${atual.quadros * 100}% 100%`,
        backgroundPosition: `${posicaoDoQuadroNaFolha(Math.min(quadro, atual.quadros - 1), atual.quadros)}% 0`,
        imageRendering: 'pixelated',
        transform: espelhado ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}
