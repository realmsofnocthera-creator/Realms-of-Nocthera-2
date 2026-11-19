import React from 'react';
import { iconeAnimadoDoEmblema, iconeDoEmblema, type TamanhoDoEmblema } from '@/assets/emblemasArte';

/**
 * A arte de um emblema. Os Míticos mostram a versão animada da estrela deles; quem pede "reduzir movimento" vê a imagem
 * parada. `tamanho` escolhe o arquivo (32 ou 64 px); o tamanho na tela vem do `className`.
 */
export function IconeDoEmblema({ tipo, estrelas = 1, tamanho = 64, className, style, alt = '' }: {
  tipo: string;
  estrelas?: number;
  tamanho?: TamanhoDoEmblema;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}) {
  const parado = iconeDoEmblema(tipo, tamanho);
  const animado = iconeAnimadoDoEmblema(tipo, estrelas);
  const img = <img src={animado ?? parado} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} className={className} style={{ imageRendering: 'pixelated', ...style }} />;
  if (!animado) return img;
  return (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={iconeDoEmblema(tipo, 64)} />
      {img}
    </picture>
  );
}
