import type { RaridadeMaterial } from './raridades';

/**
 * Pesquisa de guilda (7.3, decidida pelo Yuri em 21/10/2026): libera no nível Respeitada. Os membros doam ouro e
 * materiais para os ramos; cada ramo sobe de nível quando as duas barras (ouro e materiais) enchem. Só ganhos,
 * nada de atributos, e o bônus vale para todos os membros. Ramos de XP, ouro e XP de guilda pedidos pelo Yuri; os
 * outros três, os valores por nível e os custos são PROPOSTA, a confirmar.
 */

export const NIVEL_DA_GUILDA_PARA_PESQUISA = 3;
export const NIVEL_MAXIMO_DO_RAMO = 10;

export const RAMOS_DA_PESQUISA = [
  { id: 'xp', nome: 'Experiência', descricao: 'XP nas lutas', porNivel: 1, unidade: '%' },
  { id: 'ouro', nome: 'Riqueza', descricao: 'ouro nas lutas', porNivel: 1, unidade: '%' },
  { id: 'xpGuilda', nome: 'Renome', descricao: 'XP de guilda dos contratos', porNivel: 2, unidade: '%' },
  { id: 'materiais', nome: 'Coleta', descricao: 'chance de materiais na Caçada', porNivel: 0.5, unidade: ' ponto(s) %' },
  { id: 'contratos', nome: 'Comércio', descricao: 'ouro dos contratos', porNivel: 3, unidade: '%' },
  { id: 'incursao', nome: 'Espólios', descricao: 'recompensas das Incursões', porNivel: 3, unidade: '%' },
] as const;
export type RamoDaPesquisa = (typeof RAMOS_DA_PESQUISA)[number]['id'];
export const ehRamoDaPesquisa = (v: unknown): v is RamoDaPesquisa => typeof v === 'string' && RAMOS_DA_PESQUISA.some((r) => r.id === v);

export interface ProgressoDoRamo {
  nivel: number;
  /** O que já foi doado para o próximo nível. */
  ouro: number;
  materiais: number;
}
export type PesquisaDaGuilda = Partial<Record<RamoDaPesquisa, ProgressoDoRamo>>;

/** Custo do próximo nível (o nível que vai ser alcançado, 1 a 10): ouro 2.000 × n² e materiais 30 × n pontos. */
export function custoDoNivel(proximo: number): { ouro: number; materiais: number } {
  return { ouro: 2000 * proximo * proximo, materiais: 30 * proximo };
}

/** Pontos de pesquisa de cada material doado, pela raridade. */
export const PONTOS_POR_RARIDADE: Readonly<Record<RaridadeMaterial, number>> = { comum: 1, raro: 3, muitoRaro: 8, epico: 20, lendario: 50 };

export const progressoDoRamo = (p: PesquisaDaGuilda | undefined, ramo: RamoDaPesquisa): ProgressoDoRamo => p?.[ramo] ?? { nivel: 0, ouro: 0, materiais: 0 };

/** O bônus do ramo no nível dele (na unidade do ramo). */
export function bonusDoRamo(p: PesquisaDaGuilda | undefined, ramo: RamoDaPesquisa): number {
  const def = RAMOS_DA_PESQUISA.find((r) => r.id === ramo)!;
  return progressoDoRamo(p, ramo).nivel * def.porNivel;
}

/** O que vai para o personagem de cada membro (as lutas leem daqui, sem ler a guilda). */
export interface BonusDeGuilda {
  xp: number;
  ouro: number;
  materiais: number;
}

export function bonusDosMembros(p: PesquisaDaGuilda | undefined): BonusDeGuilda | undefined {
  const b = { xp: bonusDoRamo(p, 'xp'), ouro: bonusDoRamo(p, 'ouro'), materiais: bonusDoRamo(p, 'materiais') };
  return b.xp || b.ouro || b.materiais ? b : undefined;
}

export function pesquisaDoDocumento(bruto: unknown): PesquisaDaGuilda {
  if (typeof bruto !== 'object' || bruto === null) return {};
  const d = bruto as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const p: PesquisaDaGuilda = {};
  for (const r of RAMOS_DA_PESQUISA) {
    const o = d[r.id] as Record<string, unknown> | undefined;
    if (o && typeof o === 'object') p[r.id] = { nivel: Math.min(NIVEL_MAXIMO_DO_RAMO, num(o.nivel)), ouro: num(o.ouro), materiais: num(o.materiais) };
  }
  return p;
}

export function bonusDeGuildaDoDocumento(bruto: unknown): BonusDeGuilda | undefined {
  if (typeof bruto !== 'object' || bruto === null) return undefined;
  const d = bruto as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 100 ? v : 0);
  const b = { xp: num(d.xp), ouro: num(d.ouro), materiais: num(d.materiais) };
  return b.xp || b.ouro || b.materiais ? b : undefined;
}
