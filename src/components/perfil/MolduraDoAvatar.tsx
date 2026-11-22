'use client';

import React, { useEffect, useState } from 'react';
import { BURACO_DA_MOLDURA as B, srcDaMoldura } from '@/assets/molduras';
import { HUD_IMAGES } from '@/assets/hud';
import { MOLDURA_MAP } from '@/rules/molduras';

/** Quem pediu "reduzir movimento" vê a moldura parada. */
function usaMenosMovimento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A moldura por cima do avatar. Vai dentro de uma caixa `relative` em que o rosto ocupa 86% (o disco redondo do meio): sem `molduraId`, a moldura
 * Padrão (a redonda do Hub) cobre a caixa; com uma moldura do Yuri, ela é maior que a caixa (asas, louros, coroas) e centrada no buraco do rosto,
 * então a caixa de fora não pode cortar o que passa. As animadas tocam em laço (parada com "reduzir movimento").
 */
export function MolduraDoAvatar({ molduraId, animada = true }: { molduraId?: string | null; animada?: boolean }) {
  const [parada, setParada] = useState(false);
  useEffect(() => setParada(usaMenosMovimento()), []);
  if (!molduraId || !MOLDURA_MAP[molduraId]) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={HUD_IMAGES.molduraPerfil} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none" />;
  }
  // o disco do rosto tem 86% da caixa e o buraco da moldura, 2 x 26 de 128: a moldura inteira mede (0,86 x 128 / 52) da caixa
  const lado = (0.86 * B.lado) / (2 * B.raio);
  const esquerda = 0.5 - (B.centroX / B.lado) * lado;
  const topo = 0.5 - (B.centroY / B.lado) * lado;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={srcDaMoldura(molduraId, animada && !parada)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute select-none pointer-events-none max-w-none"
      style={{ width: `${lado * 100}%`, height: `${lado * 100}%`, left: `${esquerda * 100}%`, top: `${topo * 100}%`, imageRendering: 'pixelated' }}
    />
  );
}
