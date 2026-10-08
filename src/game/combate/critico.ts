import { GAME_CONFIG } from '@/rules/config';
import { sorteioStatus } from '../statusEffects';

/**
 * Acerto crítico (Sorte): chance = 2% + 0,1% por ponto de Sorte (calcularChanceCritico).
 * Cada golpe sorteia separadamente; o crítico dobra o dano depois da defesa do alvo.
 */

export type LadoCombate = 'personagem' | 'monstro';

// "Sal" para o sorteio do crítico não coincidir com o sorteio de status do mesmo ataque,
// nem entre o personagem e o monstro na mesma rodada.
const SAL_CRITICO = 0x5f3759df;
const SAL_LADO_MONSTRO = 0x2545f491;
// Espaço reservado de golpes por ação (Dança das Lâminas tem 5; golpe extra do Samurai é o 2º)
const GOLPES_POR_ACAO = 16;

/** Sorteio determinístico em [0, 100), derivado só de (seed, rodada, ação, golpe, lado). */
export function sorteioCritico(
  seed: number,
  rodada: number,
  indiceAtaque: number,
  indiceGolpe: number,
  lado: LadoCombate
): number {
  const semente = (Math.floor(seed) ^ SAL_CRITICO ^ (lado === 'monstro' ? SAL_LADO_MONSTRO : 0)) | 0;
  return sorteioStatus(semente, rodada, indiceAtaque * GOLPES_POR_ACAO + indiceGolpe);
}

/** Multiplicador do golpe: 2 se o sorteio cair dentro da chance de crítico, senão 1. */
export function multiplicadorCritico(sorteio: number, chanceCriticoPercentual: number): number {
  return sorteio < chanceCriticoPercentual ? GAME_CONFIG.MULTIPLICADOR_CRITICO : 1;
}
