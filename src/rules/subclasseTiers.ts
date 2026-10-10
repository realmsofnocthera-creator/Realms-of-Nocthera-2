import { GAME_CONFIG } from '@/rules/config';

/**
 * Tiers das subclasses (2.1.4). Custos definidos pelo Yuri em 10/10/2026.
 * O tier 0 é o desbloqueio da subclasse (bônus de atributos); cada tier seguinte é comprado em ordem.
 */
export interface CustoTierSubclasse {
  fragmentosAlma: number;
  ouro: number;
  /** Fragmentos da própria subclasse (dropam em níveis maiores da batalha sangrenta, Etapa 5). */
  fragmentosSubclasse: number;
}

export const CUSTO_TIER_SUBCLASSE: readonly CustoTierSubclasse[] = [
  { fragmentosAlma: 30, ouro: 10_000, fragmentosSubclasse: 0 }, // tier 0: desbloqueio
  { fragmentosAlma: 15, ouro: 15_000, fragmentosSubclasse: 0 }, // tier 1: passiva
  { fragmentosAlma: 25, ouro: 20_000, fragmentosSubclasse: 0 }, // tier 2: ataque básico
  { fragmentosAlma: 40, ouro: 25_000, fragmentosSubclasse: 0 }, // tier 3: habilidade especial
  { fragmentosAlma: 60, ouro: 40_000, fragmentosSubclasse: 5 }, // tier 4: ultimate
];

/** Tier mínimo para valer cada espaço do kit (a passiva vale a partir do tier 1). */
export const TIER_POR_ESPACO_HABILIDADE = {
  basico: 2,
  especial: 3,
  ultimate: 4,
} as const;

export function custoDoTier(tier: number): CustoTierSubclasse {
  if (!Number.isInteger(tier) || tier < 0 || tier > GAME_CONFIG.SUBCLASSE_TIER_MAX) {
    throw new Error(`Tier inválido: ${tier}`);
  }
  return CUSTO_TIER_SUBCLASSE[tier];
}
