'use client';

import React, { useEffect, useState } from 'react';
import type { PreviaDaRecompensa as Previa } from '@/assets/vipArte';

const ESTILOS = `@keyframes vp-quadros { from { background-position-x: 0%; } to { background-position-x: 100%; } }`;

function usaMenosMovimento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A prévia da arte de uma recompensa do VIP dentro do medalhão: imagem, folha de quadros (skin, aura) ou vídeo (efeito). Parada com "reduzir movimento". */
export function PreviaDaRecompensa({ previa, descricao }: { previa: Previa; descricao: string }) {
  const [parada, setParada] = useState(false);
  useEffect(() => setParada(usaMenosMovimento()), []);
  if (previa.tipo === 'imagem') {
    // as artes pequenas (emblema 16 px, balão 48 px, título 176 x 48) mantêm os pixels nítidos
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={previa.src} alt="" aria-hidden="true" draggable={false} className="max-w-full max-h-full" style={{ imageRendering: 'pixelated', width: previa.largura <= 48 ? previa.largura * 2 : undefined, objectFit: 'contain' }} />;
  }
  if (previa.tipo === 'folha') {
    const altura = Math.min(72, previa.altura * 2);
    const escala = altura / previa.altura;
    const total = previa.ms.reduce((a, b) => a + b, 0);
    return (
      <div aria-hidden="true" style={{ width: previa.largura * escala, height: altura, backgroundImage: `url(${previa.src})`, backgroundSize: `${previa.quadros * 100}% 100%`, backgroundRepeat: 'no-repeat', imageRendering: 'pixelated', animation: parada ? 'none' : `vp-quadros ${total}ms steps(${previa.quadros}, jump-none) infinite` }}>
        <style>{ESTILOS}</style>
      </div>
    );
  }
  return (
    <video aria-label={descricao} className="w-full h-full object-cover" autoPlay={!parada} loop muted playsInline preload="metadata">
      <source src={previa.webm} type="video/webm" />
      <source src={previa.mp4} type="video/mp4" />
    </video>
  );
}
