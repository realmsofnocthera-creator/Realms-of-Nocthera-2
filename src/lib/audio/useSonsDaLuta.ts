'use client';

import { useEffect } from 'react';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';
import { entrarEmLuta, precarregarSons, tocar } from '@/lib/audio/motor';
import { musicaDaLuta } from '@/rules/audio';
import { sonsDaAcao } from '@/lib/audio/sonsDeCombate';
import { SONS_COMBATE, SONS_ELEMENTOS } from '@/rules/audioSons';

/**
 * Os sons de uma luta (Caçada, Arena, Teste de Equipe...): toca a música de luta enquanto ela está na tela, baixa os sons de combate e toca o
 * golpe na hora do impacto.
 * `pvp`: os dois lados são heróis (os dois golpes soam como armas).
 */
export function useSonsDaLuta(acao: AcaoDaLuta | null | undefined, acertou: number, indice: number, pvp = false): void {
  // a luta na tela: baixa os sons de combate e troca para a música de luta (o tema do menu volta quando a luta sai)
  useEffect(() => {
    precarregarSons([...SONS_COMBATE, ...SONS_ELEMENTOS]);
    return entrarEmLuta(musicaDaLuta(window.location.pathname));
  }, []);
  useEffect(() => {
    if (!acao || acertou !== indice) return;
    for (const id of sonsDaAcao(pvp ? { ...acao, de: 'jogador' } : acao)) tocar(id);
  }, [acertou, indice, acao, pvp]);
}
