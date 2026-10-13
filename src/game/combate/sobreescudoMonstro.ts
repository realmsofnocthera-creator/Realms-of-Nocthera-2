import { GAME_CONFIG } from '@/rules/config';

/** Sobreescudo com que o monstro começa a luta: 10% do HP dele. */
export function sobreescudoInicialDoMonstro(hp: number): number {
  return Math.floor((hp * GAME_CONFIG.SOBREESCUDO_MONSTRO_PERCENTUAL_HP) / 100);
}
