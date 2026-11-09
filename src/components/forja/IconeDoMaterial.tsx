import React from 'react';
import { glifoDoMaterial, iconeDeStatus, GLIFO_DO_ORBE } from '@/assets/forjaItens';

/**
 * O ícone de um material: o glifo branco pintado com a cor da raridade (máscara). Sem glifo ainda, mostra a inicial.
 */
export function IconeDoMaterial({ id, nome, cor, className, tamanhoDaInicial }: { id: string; nome: string; cor: string; className?: string; tamanhoDaInicial?: string }) {
  const glifo = glifoDoMaterial(id, nome);
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

/** Uma etiqueta de status: o ícone (quando existe) e o nome. */
export function EtiquetaDeStatus({ nome, className, tamanho }: { nome: string; className?: string; tamanho: string }) {
  const src = iconeDeStatus(nome);
  return (
    <span className={`${className ?? ''} inline-flex items-center gap-[0.7em]`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" aria-hidden="true" draggable={false} style={{ width: tamanho, height: tamanho, imageRendering: 'pixelated' }} />}
      {nome}
    </span>
  );
}

/** O orbe de armadura pintado com a cor da sua raridade. */
export function IconeDoOrbe({ cor, className }: { cor: string; className?: string }) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{ backgroundColor: cor, WebkitMaskImage: `url(${GLIFO_DO_ORBE})`, maskImage: `url(${GLIFO_DO_ORBE})`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain', imageRendering: 'pixelated', filter: `drop-shadow(0 0 3px ${cor}88)` }}
    />
  );
}
