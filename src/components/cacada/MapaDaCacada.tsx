'use client';

import React, { useEffect, useRef } from 'react';
import { MAPAS_DA_CACADA, TIPO_AV1, TIPO_H264 } from '@/assets/mapasDaCacada';

/**
 * O mapa animado de uma estrela da Caçada: o vídeo em repetição, sem som, por cima da capa (a imagem parada). Com
 * "reduzir movimento" ligado, o vídeo fica parado na capa. `style` posiciona e dimensiona o mapa (a luta o encaixa na arena).
 */
export function MapaDaCacada({ estrela, style }: { estrela: number; style?: React.CSSProperties }) {
  const mapa = MAPAS_DA_CACADA[estrela];
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true; // o navegador só deixa tocar sozinho se estiver mudo
    const reduzir = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const ajustar = () => {
      if (reduzir?.matches) v.pause();
      else void v.play().catch(() => undefined);
    };
    ajustar();
    reduzir?.addEventListener?.('change', ajustar);
    return () => reduzir?.removeEventListener?.('change', ajustar);
  }, [estrela]);

  if (!mapa) return null;
  return (
    <video
      key={estrela}
      ref={video}
      role="img"
      aria-label={mapa.nome}
      className="absolute max-w-none pointer-events-none"
      style={{ objectFit: 'cover', imageRendering: 'pixelated', ...style }}
      poster={mapa.imagem}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
    >
      <source src={mapa.videoAv1} type={TIPO_AV1} />
      <source src={mapa.videoH264} type={TIPO_H264} />
    </video>
  );
}
