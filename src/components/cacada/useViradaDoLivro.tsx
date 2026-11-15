'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LIVRO_DA_CACADA as L, caixaEmPorcento } from '@/assets/cacadaLivroUi';

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/**
 * A virada de página do livro vermelho: `ir(destino, dir)` toca os 6 quadros (para trás, ao contrário) e, no fim, chama
 * `aoTrocar(destino)`. Com "reduzir movimento" ligado, troca na hora. Não faz nada enquanto uma virada está tocando.
 */
export function useViradaDoLivro<T>(aoTrocar: (destino: T) => void) {
  const [virando, setVirando] = useState<{ dir: 1 | -1; destino: T } | null>(null);
  const [quadro, setQuadro] = useState(0);

  // as imagens da virada já ficam baixadas antes da primeira virada
  useEffect(() => {
    L.virada.quadros.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const ir = useCallback(
    (destino: T, dir: 1 | -1) => {
      if (virando) return;
      const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduzir) aoTrocar(destino);
      else setVirando({ dir, destino });
    },
    [virando, aoTrocar]
  );

  useEffect(() => {
    if (!virando) return;
    const total = L.virada.quadros.length;
    const ordem = Array.from({ length: total }, (_, i) => i);
    const sequencia = virando.dir === 1 ? ordem : ordem.reverse();
    let passo = 0;
    setQuadro(sequencia[0]);
    const id = setInterval(() => {
      passo += 1;
      if (passo >= sequencia.length) {
        clearInterval(id);
        aoTrocar(virando.destino);
        setVirando(null);
        return;
      }
      setQuadro(sequencia[passo]);
    }, L.virada.msPorQuadro);
    return () => clearInterval(id);
  }, [virando, aoTrocar]);

  return { virando: !!virando, quadro, ir };
}

/** Os 6 quadros da virada, por cima do livro (todos ficam carregados; só o quadro atual aparece). */
export function QuadrosDaVirada({ virando, quadro }: { virando: boolean; quadro: number }) {
  return (
    <>
      {L.virada.quadros.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" aria-hidden="true" draggable={false} data-quadro={i} className="absolute pointer-events-none" style={{ ...caixaEmPorcento(L.virada.caixa), ...pixel, opacity: virando && quadro === i ? 1 : 0 }} />
      ))}
    </>
  );
}
