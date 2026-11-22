'use client';

import { useEffect } from 'react';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';
import { precarregarSons, tocar } from '@/lib/audio/motor';
import { sonsDaAcao } from '@/lib/audio/sonsDeCombate';
import { SONS_COMBATE, SONS_ELEMENTOS } from '@/rules/audioSons';

/**
 * Os sons de uma luta (Caçada, Arena, Teste de Equipe...): baixa os sons de combate quando a luta abre e toca o golpe na hora do impacto.
 * `pvp`: os dois lados são heróis (os dois golpes soam como armas).
 */
export function useSonsDaLuta(acao: AcaoDaLuta | null | undefined, acertou: number, indice: number, pvp = false): void {
  useEffect(() => {
    precarregarSons([...SONS_COMBATE, ...SONS_ELEMENTOS]);
  }, []);
  useEffect(() => {
    if (!acao || acertou !== indice) return;
    for (const id of sonsDaAcao(pvp ? { ...acao, de: 'jogador' } : acao)) tocar(id);
  }, [acertou, indice, acao, pvp]);
}
