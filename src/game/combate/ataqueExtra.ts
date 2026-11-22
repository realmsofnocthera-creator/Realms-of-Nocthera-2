import { GAME_CONFIG } from '@/rules/config';

/**
 * Balanceamento 2.2: a chance de um ataque extra por Agilidade (função pura).
 * chance = (AGI atacante − AGI defensor) / (AGI atacante + AGI defensor), entre 0 e o teto (40%); o Sincronismo soma 10 pontos percentuais.
 * Quem tem menos ou a mesma Agilidade do que o alvo não ganha chance. O sorteio vem da semente da luta (determinístico).
 */
export function chanceDeAtaqueExtraPorAgilidade(agilidadeAtacante: number, agilidadeDefensor: number, comSincronismo = false): number {
  const soma = agilidadeAtacante + agilidadeDefensor;
  if (agilidadeAtacante <= 0 || soma <= 0) return 0;
  const base = Math.min(GAME_CONFIG.CHANCE_ATAQUE_EXTRA_AGILIDADE_MAXIMA, Math.max(0, (agilidadeAtacante - agilidadeDefensor) / soma));
  return base > 0 || comSincronismo ? base + (comSincronismo ? GAME_CONFIG.BONUS_SINCRONISMO_CHANCE_ATAQUE_EXTRA : 0) : 0;
}
