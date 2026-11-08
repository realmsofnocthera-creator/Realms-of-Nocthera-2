import React from 'react';
import { glifoDoMaterial } from '@/assets/forjaItens';

/**
 * O ícone de um material: o glifo branco pintado com a cor da raridade (máscara). Sem glifo ainda, mostra a inicial.
 */
export function IconeDoMaterial({ id, nome, cor, className, tamanhoDaInicial }: { id: string; nome: string; cor: string; className?: string; tamanhoDaInicial?: string }) {
  const glifo = glifoDoMaterial(id);
  if (!glifo) {
    return (
      <span className={`${className ?? ''} flex items-center justify-center font-cinzel font-extrabold leading-none`} style={{ color: cor, fontSize: tamanhoDaInicial }} aria-hidden="true">
        {nome.replace(/^Diverso\s+/, '').charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        backgroundColor: cor,
        WebkitMaskImage: `url(${glifo})`,
        maskImage: `url(${glifo})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        imageRendering: 'pixelated',
        filter: `drop-shadow(0 0 3px ${cor}88)`,
      }}
    />
  );
}
