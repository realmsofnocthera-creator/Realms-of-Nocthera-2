import React from 'react';
import { elementoDoTexto, iconeDeElemento, NOMES_DOS_ELEMENTOS, type VarianteDoIconeDeElemento } from '@/assets/elementos';
import type { Elemento } from '@/rules/elements';

interface IconeDeElementoProps {
  /** O código ('fogo') ou o nome ('Relâmpago') do elemento. Texto que não é elemento não mostra nada. */
  elemento: Elemento | string;
  variante?: VarianteDoIconeDeElemento;
  /** Lado em pixels (o ícone é quadrado). */
  tamanho?: number;
  className?: string;
}

export function IconeDeElemento({ elemento, variante = 'simples', tamanho = 18, className = '' }: IconeDeElementoProps) {
  const id = elementoDoTexto(String(elemento));
  if (!id) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconeDeElemento(id, variante)}
      alt={NOMES_DOS_ELEMENTOS[id]}
      title={NOMES_DOS_ELEMENTOS[id]}
      width={tamanho}
      height={tamanho}
      loading="lazy"
      draggable={false}
      style={{ width: tamanho, height: tamanho }}
      className={`inline-block object-contain align-middle select-none ${className}`}
    />
  );
}

/** Lista de elementos com o ícone de cada um (ex.: "[fogo] [gelo]"), para armas e equipamentos. */
export function IconesDeElementos({ elementos, tamanho = 16 }: { elementos: readonly (Elemento | string)[]; tamanho?: number }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {elementos.map((e) => (
        <IconeDeElemento key={String(e)} elemento={e} tamanho={tamanho} />
      ))}
    </span>
  );
}
