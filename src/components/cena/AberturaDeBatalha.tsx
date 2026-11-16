'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TEXTOS_DA_ABERTURA as T } from '@/rules/textosDaAbertura';

/** O vídeo da abertura (arte do Yuri): 768 x 432, 24 quadros por segundo, com o fundo verde que vira transparente. */
export const VIDEO_DA_ABERTURA = { src: '/videos/batalha-abertura.mp4', largura: 768, altura: 432 } as const;

/**
 * A linha do tempo do vídeo (em segundos): a cena escura abre, a faixa de tela estilhaça e o "BATALHA!" aparece. O
 * fundo escuro (que cobre a tela inteira, pois o vídeo é deitado) some quando as rachaduras começam, e a abertura acaba
 * antes do tremor final do vídeo.
 */
export const TEMPOS_DA_ABERTURA = { rachaduras: 1.62, fimDaFaixa: 4.05, esperaMaxima: 2.5 } as const;

/** Luz de uma cor para decidir se o quadro é um clarão branco. */
const LIMITE_DE_CLARAO = 150;

/**
 * Tira o verde de um quadro: o fundo vira transparente (com borda suave) e o verde que sobra nas bordas é apagado.
 * Devolve a luz média do quadro (para achar os clarões).
 */
export function tirarOVerde(dados: Uint8ClampedArray): number {
  let soma = 0;
  for (let i = 0; i < dados.length; i += 4) {
    const r = dados[i];
    const g = dados[i + 1];
    const b = dados[i + 2];
    const maior = r > b ? r : b;
    const verde = g - maior;
    soma += (r + g + b) / 3;
    if (verde > 18) {
      const alfa = 1 - (verde - 18) / 50;
      dados[i + 3] = alfa <= 0 ? 0 : alfa * 255;
      dados[i + 1] = maior; // tira o verde que sobrou na borda
    }
  }
  return soma / (dados.length / 4);
}

/**
 * A abertura de TODO combate: a cena do Yuri (a tela escura estilhaça e aparece "BATALHA! — o confronto começa —") por
 * cima da luta, que só começa quando a abertura acaba (`aoTerminar`). O vídeo tem fundo verde: cada quadro passa por um
 * canvas que apaga o verde, então o que está por baixo aparece pelos estilhaços. Os clarões brancos que piscam rápido
 * viram um único clarão suave (segurança para quem é sensível a luz), e quem pede "reduzir movimento" pula a abertura.
 * Tocar na tela pula. Se o vídeo não carregar ou não tocar, a luta começa na hora.
 */
export function AberturaDeBatalha({ aoTerminar }: { aoTerminar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const acabou = useRef(false);
  const [coberto, setCoberto] = useState(true);
  const [clarao, setClarao] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const terminar = useCallback(() => {
    if (acabou.current) return;
    acabou.current = true;
    setSaindo(true);
    window.setTimeout(aoTerminar, 160);
  }, [aoTerminar]);

  useEffect(() => {
    const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const v = video.current;
    const c = canvas.current;
    const ctx = c?.getContext('2d', { willReadFrequently: true });
    if (reduzir || !v || !c || !ctx) {
      terminar();
      return;
    }
    v.muted = true;
    let quadro = 0;
    let jaPiscou = false;
    let ultimaImagem: ImageData | null = null;
    const desenhar = () => {
      quadro = requestAnimationFrame(desenhar);
      if (v.readyState < 2) return;
      const t = v.currentTime;
      if (t >= TEMPOS_DA_ABERTURA.rachaduras) setCoberto(false);
      if (t >= TEMPOS_DA_ABERTURA.fimDaFaixa) {
        terminar();
        return;
      }
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const imagem = ctx.getImageData(0, 0, c.width, c.height);
      const luz = tirarOVerde(imagem.data);
      if (luz > LIMITE_DE_CLARAO) {
        // clarão: um só, suave; nos demais, repete o quadro anterior
        if (!jaPiscou) {
          jaPiscou = true;
          setClarao(true);
          window.setTimeout(() => setClarao(false), 180);
        }
        if (ultimaImagem) ctx.putImageData(ultimaImagem, 0, 0);
        return;
      }
      ultimaImagem = imagem;
      ctx.putImageData(imagem, 0, 0);
    };
    quadro = requestAnimationFrame(desenhar);
    v.play().catch(() => terminar());
    // se o vídeo não começar a tocar a tempo, não prende a luta
    const espera = window.setTimeout(() => {
      if (v.currentTime === 0) terminar();
    }, TEMPOS_DA_ABERTURA.esperaMaxima * 1000);
    return () => {
      cancelAnimationFrame(quadro);
      window.clearTimeout(espera);
    };
  }, [terminar]);

  return (
    <div
      role="status"
      aria-label={T.anuncio}
      onClick={terminar}
      className="fixed inset-0 z-[100] overflow-hidden cursor-pointer select-none"
      style={{ opacity: saindo ? 0 : 1, transition: 'opacity 160ms ease-out', touchAction: 'manipulation' }}
    >
      {/* o fundo escuro (a cena do vídeo é deitada, então ele cobre o resto da tela até as rachaduras) */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, #1b1224 0%, #0b0710 80%)', opacity: coberto ? 1 : 0, transition: 'opacity 280ms ease-out' }} />
      <video ref={video} muted playsInline preload="auto" aria-hidden="true" className="hidden" onEnded={terminar} onError={terminar}>
        <source src={VIDEO_DA_ABERTURA.src} type="video/mp4" />
      </video>
      <canvas
        ref={canvas}
        aria-hidden="true"
        width={VIDEO_DA_ABERTURA.largura}
        height={VIDEO_DA_ABERTURA.altura}
        className="absolute left-0 top-1/2 w-full -translate-y-1/2"
        style={{ imageRendering: 'pixelated', aspectRatio: `${VIDEO_DA_ABERTURA.largura} / ${VIDEO_DA_ABERTURA.altura}` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: clarao ? 0.55 : 0, transition: 'opacity 90ms linear' }} />
    </div>
  );
}
