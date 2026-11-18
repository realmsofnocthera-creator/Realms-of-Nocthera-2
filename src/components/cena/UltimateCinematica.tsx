'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { videoDaUltimate, type ModoDaUltimate } from '@/assets/ultimates';
import { TEXTOS_DA_ULTIMATE as T } from '@/rules/textosDoCombate';

/**
 * A ultimate (vídeo do Yuri) por cima da luta: a cinematográfica completa toma a tela inteira; o corte da cara aparece sobre a
 * luta (o preto do vídeo some pela mistura "tela"). Toque para pular. Com "reduzir movimento" ou se o vídeo não tocar, ela
 * termina na hora. No 2x o vídeo toca em dobro. `aoTerminar` é chamado uma vez só.
 */
export function UltimateCinematica({ id, modo, rapido, aoTerminar }: { id: string; modo: ModoDaUltimate; rapido: boolean; aoTerminar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const acabou = useRef(false);
  const terminar = useCallback(() => {
    if (acabou.current) return;
    acabou.current = true;
    aoTerminar();
  }, [aoTerminar]);

  useEffect(() => {
    const v = video.current;
    const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!v || reduzir) {
      terminar();
      return;
    }
    v.muted = true;
    v.playbackRate = rapido ? 2 : 1;
    v.play().catch(() => terminar());
    // se o vídeo não começar a tocar a tempo, a luta segue
    const espera = window.setTimeout(() => {
      if (v.currentTime === 0) terminar();
    }, 3000);
    return () => window.clearTimeout(espera);
  }, [terminar, rapido]);

  return (
    <div
      role="dialog"
      aria-label={T.aria}
      onClick={terminar}
      className="fixed inset-0 z-[95] cursor-pointer select-none"
      style={{ background: modo === 'cinematica' ? '#06030a' : 'transparent', touchAction: 'manipulation' }}
    >
      <video
        ref={video}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated', mixBlendMode: modo === 'corte' ? 'screen' : 'normal' }}
        onEnded={terminar}
        onError={terminar}
      >
        <source src={videoDaUltimate(id, modo)} type="video/mp4" />
      </video>
      <span className="absolute right-3 top-[max(10px,env(safe-area-inset-top))] font-cinzel font-bold text-[12px] text-white/70" style={{ textShadow: '1px 1px 0 #000' }}>{T.pular}</span>
    </div>
  );
}
