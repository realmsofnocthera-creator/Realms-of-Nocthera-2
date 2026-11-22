import React from 'react';
import { srcDoTitulo } from '@/assets/molduras';
import { TITULO_MAP } from '@/rules/titulos';

/**
 * A faixa de um título (arte do Yuri, 176 x 48: o medalhão do emblema e a barra escura), com o nome escrito na barra. A arte vem sem texto, então o
 * nome é desenhado aqui, num tamanho que sempre cabe na barra (o maior é "Campeão do Chefe Mundial"). Tem a largura do pai; `apagada` deixa em cinza (título que o
 * jogador ainda não tem).
 */
export function FaixaDoTitulo({ id, apagada, className = '', style }: { id: string; apagada?: boolean; className?: string; style?: React.CSSProperties }) {
  const nome = TITULO_MAP[id]?.nome ?? '';
  // a barra mede 122 de 176 (69%) e o texto Cinzel gasta cerca de 0,6 do corpo por letra
  const corpo = Math.min(6.2, 64 / Math.max(1, nome.length * 0.6));
  return (
    <span className={`relative block ${className}`} style={{ aspectRatio: '176 / 48', containerType: 'inline-size', ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={srcDoTitulo(id)} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full select-none pointer-events-none" style={{ imageRendering: 'pixelated', filter: apagada ? 'grayscale(1) brightness(.55)' : undefined }} />
      <span className="absolute flex items-center justify-center font-cinzel font-black text-center leading-none whitespace-nowrap" style={{ left: '27.5%', width: '68%', top: '12%', height: '76%', fontSize: `${corpo}cqw`, color: apagada ? '#9a8f78' : '#F5E3B3', textShadow: '0 1px 0 #000, 0 0 3px #000' }}>{nome}</span>
    </span>
  );
}
