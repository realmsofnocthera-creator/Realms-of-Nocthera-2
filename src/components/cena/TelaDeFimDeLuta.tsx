'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tirarOVerde } from './AberturaDeBatalha';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DO_FIM_DA_LUTA as T } from '@/rules/textosDoCombate';

/** Os vídeos de vitória e de derrota (arte do Yuri, 1024 x 1536 reduzido a 576 x 864, fundo verde que vira transparente). */
export const VIDEOS_DO_FIM = {
  vitoria: '/videos/batalha-vitoria-v1.mp4',
  derrota: '/videos/batalha-derrota-v1.mp4',
  largura: 576,
  altura: 864,
} as const;

/** Uma caixa em pixels do quadro original de 1024 x 1536: esquerda, topo, largura, altura e o segundo em que aparece. */
interface Buraco {
  x: number;
  y: number;
  l: number;
  a: number;
  t: number;
}

/**
 * Onde o vídeo deixou buracos (verdes) para o jogo preencher, medidos no quadro de 1024 x 1536, e quando cada um aparece.
 * Vitória: o retrato, a barra de XP, a de ouro e os 5 espólios. Derrota: o retrato e os dois botões.
 */
export const BURACOS = {
  vitoria: {
    retrato: { x: 104, y: 656, l: 256, a: 256, t: 1.45 },
    xp: { x: 408, y: 744, l: 512, a: 40, t: 1.7 },
    ouro: { x: 472, y: 840, l: 448, a: 48, t: 1.9 },
    espolios: [104, 272, 440, 608, 776].map((x, i) => ({ x, y: 1048, l: 136, a: 136, t: [2.24, 2.4, 2.57, 2.74, 2.9][i] })),
    /** os botões ficam embaixo do painel, onde o vídeo escreve "toque para continuar" */
    botoes: { x: 60, y: 1372, l: 904, a: 92, t: 3.0 },
  },
  derrota: {
    retrato: { x: 384, y: 688, l: 256, a: 256, t: 1.7 },
    repetir: { x: 180, y: 1078, l: 664, a: 86, t: 2.0 },
    voltar: { x: 180, y: 1206, l: 664, a: 86, t: 2.17 },
  },
} as const;

const L = 1024;
const A = 1536;
const caixa = (b: Omit<Buraco, 't'>): React.CSSProperties => ({ left: `${(b.x / L) * 100}%`, top: `${(b.y / A) * 100}%`, width: `${(b.l / L) * 100}%`, height: `${(b.a / A) * 100}%` });

export interface EspolioDaLuta {
  id: string;
  nome: string;
  quantidade: number;
  /** o ícone pronto (moldura de raridade e glifo) */
  icone: React.ReactNode;
}

export interface BotaoDoFim {
  rotulo: string;
  acao: () => void;
  desligado?: boolean;
}

export interface TelaDeFimProps {
  tipo: 'vitoria' | 'derrota';
  /** o quadro de cima: na vitória, o ícone da criatura vencida; na derrota, o retrato do herói */
  retrato: string;
  xp?: { ganho: number; nivelNovo?: number; progresso: number };
  ouro?: number;
  espolios?: EspolioDaLuta[];
  /** uma linha extra embaixo (por exemplo, "a 4★ está liberada") */
  aviso?: string;
  /** voltar (ao livro, à torre...) e repetir a luta; sem eles, a tela some sozinha quando o vídeo acaba */
  voltar?: BotaoDoFim;
  repetir?: BotaoDoFim;
  aoAcabar?: () => void;
}

/**
 * A tela de vitória ou de derrota (vídeos do Yuri) por cima da luta. O vídeo tem fundo verde: cada quadro passa por um
 * canvas que apaga o verde, então a luta continua aparecendo atrás. O jogo preenche os buracos que o vídeo deixou (o
 * retrato, a XP, o ouro, os espólios e os botões), cada um na hora em que o buraco aparece. Com "reduzir movimento", o
 * vídeo pula direto para o fim.
 */
export function TelaDeFimDeLuta({ tipo, retrato, xp, ouro, espolios = [], aviso, voltar, repetir, aoAcabar }: TelaDeFimProps) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tempo, setTempo] = useState(0);
  const acabou = useRef(false);
  const saiu = useRef(false);
  const sair = useCallback(() => {
    if (saiu.current || !aoAcabar) return;
    saiu.current = true;
    aoAcabar();
  }, [aoAcabar]);

  const fimDoVideo = useCallback(() => {
    if (acabou.current) return;
    acabou.current = true;
    setTempo(99);
    if (!voltar && !repetir) window.setTimeout(sair, 1600);
  }, [voltar, repetir, sair]);

  useEffect(() => {
    const v = video.current;
    const c = canvas.current;
    const ctx = c?.getContext('2d', { willReadFrequently: true });
    if (!v || !c || !ctx) return;
    v.muted = true;
    const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let quadro = 0;
    const desenhar = () => {
      if (v.readyState >= 2) {
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const imagem = ctx.getImageData(0, 0, c.width, c.height);
        tirarOVerde(imagem.data);
        ctx.putImageData(imagem, 0, 0);
        setTempo(v.currentTime);
      }
      if (!v.ended) quadro = requestAnimationFrame(desenhar);
    };
    const comecar = () => {
      if (reduzir) {
        v.currentTime = Math.max(0, (v.duration || 4.5) - 0.05);
        v.addEventListener('seeked', () => { desenhar(); fimDoVideo(); }, { once: true });
        return;
      }
      quadro = requestAnimationFrame(desenhar);
      v.play().catch(() => fimDoVideo());
    };
    if (v.readyState >= 1) comecar();
    else v.addEventListener('loadedmetadata', comecar, { once: true });
    // se o vídeo não tocar a tempo, mostra tudo assim mesmo
    const espera = window.setTimeout(() => { if (v.currentTime === 0) fimDoVideo(); }, 3000);
    return () => {
      cancelAnimationFrame(quadro);
      window.clearTimeout(espera);
    };
  }, [fimDoVideo]);

  const visivel = (t: number): React.CSSProperties => ({ opacity: tempo >= t ? 1 : 0, transform: tempo >= t ? 'scale(1)' : 'scale(.85)', transition: 'opacity 200ms ease-out, transform 200ms ease-out' });
  const B = BURACOS;
  const botao = (b: BotaoDoFim, destaque: boolean, estilo: React.CSSProperties) => (
    <button
      type="button"
      onClick={b.acao}
      disabled={b.desligado}
      className="flex items-center justify-center border-[3px] cursor-pointer active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-pixel)] uppercase tracking-[0.06em] whitespace-nowrap text-[clamp(8px,2.4vw,12px)] leading-none px-[2%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6FE3EE]"
      style={{ color: '#F1DED6', background: destaque ? 'linear-gradient(#7A1520,#4A0A12)' : '#2E060C', borderColor: destaque ? '#B0303C' : '#5A1820', boxShadow: 'inset 0 0 0 1px #12030600', ...estilo }}
    >
      {b.rotulo}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={tipo === 'vitoria' ? T.vitoria : T.derrota} className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: tipo === 'vitoria' ? 'rgba(0,0,0,.35)' : 'rgba(10,0,2,.45)' }}>
      <div className="relative" style={{ width: 'min(100vw, calc(100dvh * 2 / 3))', aspectRatio: `${L} / ${A}` }}>
        <video ref={video} muted playsInline preload="auto" aria-hidden="true" className="hidden" onEnded={fimDoVideo} onError={fimDoVideo}>
          <source src={VIDEOS_DO_FIM[tipo]} type="video/mp4" />
        </video>
        <canvas ref={canvas} aria-hidden="true" width={VIDEOS_DO_FIM.largura} height={VIDEOS_DO_FIM.altura} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />

        {tipo === 'vitoria' ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={retrato} alt="" aria-hidden="true" className="absolute object-contain bg-[#1a1016]" style={{ ...caixa(B.vitoria.retrato), ...visivel(B.vitoria.retrato.t), imageRendering: 'pixelated' }} />
            {xp && (
              <div className="absolute overflow-hidden bg-[#1a1016]" style={{ ...caixa(B.vitoria.xp), ...visivel(B.vitoria.xp.t) }} aria-label={textoDaFicha(T.xpAria, { n: xp.ganho })}>
                <div className="absolute inset-y-0 left-0" style={{ width: `${Math.round(Math.min(1, Math.max(0, xp.progresso)) * 100)}%`, background: 'linear-gradient(180deg,#7DD3F0,#2A7CB8)', transition: 'width 900ms ease-out 300ms' }} />
                <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black text-[clamp(9px,2.8vw,14px)] text-white" style={{ textShadow: '1px 1px 0 #000' }}>
                  {xp.nivelNovo ? textoDaFicha(T.subiuNivel, { n: xp.ganho, nivel: xp.nivelNovo }) : textoDaFicha(T.xp, { n: xp.ganho })}
                </span>
              </div>
            )}
            {ouro !== undefined && (
              <div className="absolute flex items-center px-[2%] bg-[#1a1016]" style={{ ...caixa(B.vitoria.ouro), ...visivel(B.vitoria.ouro.t) }} aria-label={textoDaFicha(T.ouroAria, { n: ouro })}>
                <span className="font-cinzel font-black text-[clamp(10px,3vw,15px)]" style={{ color: ouro >= 0 ? '#F3C769' : '#FF8A80', textShadow: '1px 1px 0 #000' }}>
                  {ouro >= 0 ? textoDaFicha(T.ouro, { n: ouro }) : textoDaFicha(T.ouroPerdido, { n: ouro })}
                </span>
              </div>
            )}
            {B.vitoria.espolios.map((b, i) => {
              const e = espolios[i];
              return (
                <div key={i} className="absolute flex items-center justify-center bg-[#1a1016]" style={{ ...caixa(b), ...visivel(b.t) }} title={e ? textoDaFicha(T.espolio, { nome: e.nome, qtd: e.quantidade }) : undefined} aria-label={e ? textoDaFicha(T.espolio, { nome: e.nome, qtd: e.quantidade }) : T.semEspolio}>
                  {e && (
                    <>
                      <span className="w-[86%] h-[86%] flex items-center justify-center">{e.icone}</span>
                      {e.quantidade > 1 && <span className="absolute right-[4%] bottom-[2%] font-cinzel font-black text-[clamp(8px,2.4vw,12px)] text-white" style={{ textShadow: '1px 1px 0 #000' }}>×{e.quantidade}</span>}
                    </>
                  )}
                </div>
              );
            })}
            {(voltar || repetir) && (
              <div className="absolute flex gap-[3%]" style={{ ...caixa(B.vitoria.botoes), ...visivel(B.vitoria.botoes.t) }}>
                {voltar && botao(voltar, false, { flex: 1 })}
                {repetir && botao(repetir, true, { flex: 1 })}
              </div>
            )}
            {aviso && (
              <p className="absolute inset-x-[6%] text-center font-cinzel font-black text-[clamp(9px,2.6vw,13px)] text-[#F3C769]" style={{ top: `${(1478 / A) * 100}%`, textShadow: '1px 1px 0 #000', ...visivel(B.vitoria.botoes.t) }}>{aviso}</p>
            )}
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={retrato} alt="" aria-hidden="true" className="absolute object-cover bg-[#1a1016]" style={{ ...caixa(B.derrota.retrato), ...visivel(B.derrota.retrato.t), filter: 'grayscale(.75) brightness(.8)' }} />
            {repetir && <div className="absolute" style={{ ...caixa(B.derrota.repetir), ...visivel(B.derrota.repetir.t) }}>{botao(repetir, true, { width: '100%', height: '100%' })}</div>}
            {voltar && <div className="absolute" style={{ ...caixa(B.derrota.voltar), ...visivel(B.derrota.voltar.t) }}>{botao(voltar, false, { width: '100%', height: '100%' })}</div>}
          </>
        )}

        {/* sem botões (outros modos): toque para continuar quando o vídeo acabar */}
        {!voltar && !repetir && aoAcabar && tempo >= 99 && (
          <button type="button" onClick={sair} className="absolute inset-0 cursor-pointer" aria-label={T.continuar} />
        )}
      </div>
    </div>
  );
}
