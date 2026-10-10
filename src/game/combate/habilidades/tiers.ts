import { TIER_POR_ESPACO_HABILIDADE } from '@/rules/subclasseTiers';
import { Subclasse, SUBCLASSES } from '@/rules/subclasses';
import { obterHabilidade } from './registro';

/** Subclasse dona de uma habilidade de kit (o id da habilidade começa com o id da subclasse). */
export function subclasseDaHabilidade(habilidadeId: string): Subclasse | undefined {
  return SUBCLASSES.find((s) => habilidadeId.startsWith(`${s.id}_`));
}

export interface ContextoTierHabilidade {
  subclasseAtualId?: string | null;
  subclasseTiers?: Record<string, number>;
}

/**
 * Habilidade de subclasse só vale com a subclasse ativa e o tier do espaço comprado
 * (básico no tier 2, especial no 3 e ultimate no 4). Habilidades que não são de kit sempre valem.
 */
export function habilidadeLiberadaPorTier(habilidadeId: string, c: ContextoTierHabilidade): boolean {
  const sub = subclasseDaHabilidade(habilidadeId);
  if (!sub) return true;
  if (c.subclasseAtualId?.trim().toLowerCase() !== sub.id) return false;
  const espaco = obterHabilidade(habilidadeId)?.espaco;
  if (!espaco) return true;
  return (c.subclasseTiers?.[sub.id] ?? 0) >= TIER_POR_ESPACO_HABILIDADE[espaco];
}
