import type { Elemento } from '@/rules/elements';
import type { CondicaoDoEfeito } from '@/rules/emblemasEfeitos';
import type { EmblemasNoCombate } from '../emblemasEfeitos';

/** O que o motor sabe do golpe na hora de avaliar as condições dos emblemas. */
export interface ContextoEmblema {
  hpAlvo: number;
  hpMaxAlvo: number;
  hpAtacante: number;
  hpMaxAtacante: number;
  alvoChefe: boolean;
  alvoComEscudo: boolean;
  alvoComBonus: boolean;
  alvoComNegativo: boolean;
  /** Condições de status do alvo no momento do golpe. */
  alvoStatus: ReadonlySet<'sangramento' | 'veneno' | 'queimadura' | 'congelado' | 'maldicao'>;
}

/** Todas as condições preenchidas valem ao mesmo tempo? */
export function condicaoDoEmblemaVale(c: CondicaoDoEfeito, ctx: ContextoEmblema): boolean {
  const pct = (hp: number, max: number): number => (max > 0 ? (hp * 100) / max : 100);
  if (c.alvoHpAbaixo !== undefined && !(pct(ctx.hpAlvo, ctx.hpMaxAlvo) < c.alvoHpAbaixo)) return false;
  if (c.atacanteHpAbaixo !== undefined && !(pct(ctx.hpAtacante, ctx.hpMaxAtacante) < c.atacanteHpAbaixo)) return false;
  if (c.atacanteHpAcima !== undefined && !(pct(ctx.hpAtacante, ctx.hpMaxAtacante) > c.atacanteHpAcima)) return false;
  if (c.alvoStatus && !c.alvoStatus.some((s) => ctx.alvoStatus.has(s))) return false;
  if (c.alvoComEscudo && !ctx.alvoComEscudo) return false;
  if (c.alvoComBonus && !ctx.alvoComBonus) return false;
  if (c.alvoComNegativo && !ctx.alvoComNegativo) return false;
  if (c.alvoChefe && !ctx.alvoChefe) return false;
  return true;
}

function somaCondicionada(lista: readonly { percentual: number; condicao: CondicaoDoEfeito }[], ctx: ContextoEmblema): number {
  let total = 0;
  for (const e of lista) if (condicaoDoEmblemaVale(e.condicao, ctx)) total += e.percentual;
  return total;
}

/** +% de dano dos emblemas que dependem do estado da luta (soma na regra 1.2.2). */
export function bonusDanoCondicionalDeEmblemas(e: EmblemasNoCombate | undefined, ctx: ContextoEmblema): number {
  return e ? somaCondicionada(e.danoSe, ctx) : 0;
}

/** +% de dano do elemento do golpe dos emblemas condicionais (soma com o dano elemental). */
export function bonusElementalCondicionalDeEmblemas(e: EmblemasNoCombate | undefined, elemento: Elemento, ctx: ContextoEmblema): number {
  return e ? somaCondicionada(e.danoElementalSe.filter((x) => x.elemento === elemento), ctx) : 0;
}

/** Multiplicador extra do acerto crítico: 1 + soma dos bônus de dano crítico que valem. */
export function fatorDanoCriticoDeEmblemas(e: EmblemasNoCombate | undefined, ctx: ContextoEmblema): number {
  return e ? 1 + somaCondicionada(e.danoCritico, ctx) / 100 : 1;
}

/** Duração com o bônus (%) dos emblemas: arredonda para o inteiro mais próximo, sem nunca encurtar. */
export function duracaoComBonus(base: number, bonusPercentual: number): number {
  if (bonusPercentual <= 0) return base;
  return base + Math.floor((base * bonusPercentual) / 100 + 0.5);
}
