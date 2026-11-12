'use client';

import React from 'react';

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
export const CONTORNO_PIXEL = '0.2cqw 0 0 #05070D, -0.2cqw 0 0 #05070D, 0 0.2cqw 0 #05070D, 0 -0.2cqw 0 #05070D';

interface PlacaPixelProps {
  /** A moldura (arte do Yuri). */
  src: string;
  /** A proporção da arte (largura / altura). */
  aspecto: string;
  /** A largura na tela, em cqw. */
  largura: string;
  children: React.ReactNode;
  /** Com `onClick` a placa vira botão. */
  onClick?: () => void;
  rotulo?: string;
  /** Quanto fica livre nas pontas ornamentadas, em % da largura (esquerda, direita). */
  margens?: [number, number];
  /** Botão apagado: não clica e escurece. */
  desligada?: boolean;
  className?: string;
}

/** Uma placa de texto sobre uma moldura (título ou botão): o texto fica centrado entre as pontas ornamentadas. */
export function PlacaPixel({ src, aspecto, largura, children, onClick, rotulo, margens = [14, 14], desligada = false, className = '' }: PlacaPixelProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={desligada ? undefined : onClick}
      disabled={onClick ? desligada : undefined}
      aria-label={rotulo}
      className={`relative block shrink-0 ${onClick && !desligada ? 'cursor-pointer active:translate-y-px' : ''} ${desligada ? 'cursor-not-allowed' : ''} ${className}`}
      style={{ width: largura, aspectRatio: aspecto }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ ...pixel, filter: desligada ? 'grayscale(0.7) brightness(0.55)' : undefined }} />
      <span className={`absolute inset-y-0 flex items-center justify-center font-cinzel font-extrabold uppercase tracking-wide leading-[1.4] text-center ${desligada ? 'text-[#8FA3BF]' : 'text-[#DFF3FF]'}`} style={{ left: `${margens[0]}%`, right: `${margens[1]}%`, fontSize: '2.7cqw', textShadow: CONTORNO_PIXEL }}>
        <span className="truncate">{children}</span>
      </span>
    </Tag>
  );
}
