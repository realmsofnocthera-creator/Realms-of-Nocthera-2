'use client';

import { useSyncExternalStore } from 'react';

/**
 * O personagem que está na tela, para o que fica em todas as telas (o tutorial). Quem já carregou o personagem publica aqui o uid e o nível, então
 * nada é lido de novo do servidor.
 */
export interface PersonagemAtual {
  uid: string;
  nivel: number;
}

let atual: PersonagemAtual | null = null;
const ouvintes = new Set<() => void>();

export function publicarPersonagem(p: { uid?: string; nivel?: number } | null | undefined): void {
  const novo = p?.uid && typeof p.nivel === 'number' ? { uid: p.uid, nivel: p.nivel } : null;
  if (novo?.uid === atual?.uid && novo?.nivel === atual?.nivel) return;
  atual = novo;
  ouvintes.forEach((f) => f());
}

export function usePersonagemAtual(): PersonagemAtual | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
    () => null
  );
}
