'use client';

import { useSyncExternalStore } from 'react';

/** Se o guia do tutorial está na tela: a luta espera (não avança de golpe) enquanto o jogador lê. */
let aberto = false;
const ouvintes = new Set<() => void>();

export function marcarTutorialAberto(v: boolean): void {
  if (v === aberto) return;
  aberto = v;
  ouvintes.forEach((f) => f());
}

export function useTutorialAberto(): boolean {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => aberto,
    () => false
  );
}
