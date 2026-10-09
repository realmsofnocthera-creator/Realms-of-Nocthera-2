import { EfeitoStatus } from '@/rules/statusEffects';
import { GAME_CONFIG } from '@/rules/config';
import { DebuffAtivo } from './efeitosDebuffs';

/**
 * Catálogo 1.2 — "Bônus por status no alvo" (1.9.1).
 * A habilidade escolhe de quais condições se beneficia (campo `bonusPorStatusAlvo`); cada condição ativa no alvo
 * soma a sua % na regra 1.2.2 (grupo único do dano causado). Valores da lista do Yuri.
 */
export type CondicaoAlvo =
  | 'sangramento'
  | 'veneno'
  | 'podridaoEscarlate'
  | 'congelado'
  | 'dormindo'
  | 'louco'
  | 'maldicao'
  | 'paralisado';

export const BONUS_DANO_POR_CONDICAO_PERCENTUAL: Readonly<Record<CondicaoAlvo, number>> = {
  sangramento: 5,
  veneno: 3,
  podridaoEscarlate: 4,
  congelado: 10,
  dormindo: 15,
  louco: 8,
  maldicao: 12,
  paralisado: 20,
};

/** Status instantâneos que deixam o alvo marcado até o fim da luta (Sangramento e Maldição). */
export type EstadoDeLuta = 'sangramento' | 'maldicao';

export interface AlvoComStatus {
  /** Status de dano contínuo ativos no alvo (copiados do estado da luta antes de cada ação). */
  statusAtivos?: readonly EfeitoStatus[];
  /** Sangramento e Maldição, que duram até o fim da luta. */
  estadosDeLuta?: readonly EstadoDeLuta[];
  debuffs?: readonly DebuffAtivo[];
  marcas?: number;
}

/** Condições da lista que estão valendo no alvo agora. */
export function condicoesDoAlvo(alvo: AlvoComStatus): CondicaoAlvo[] {
  const condicoes = new Set<CondicaoAlvo>();
  for (const s of alvo.statusAtivos ?? []) {
    if (s === 'veneno' || s === 'podridaoEscarlate') condicoes.add(s);
  }
  for (const e of alvo.estadosDeLuta ?? []) condicoes.add(e);
  for (const d of alvo.debuffs ?? []) {
    if (d.rodadasRestantes <= 0) continue;
    if (d.tipo === 'sono') condicoes.add('dormindo');
    if (d.tipo === 'loucura') condicoes.add('louco');
    if (d.tipo === 'paralisia') condicoes.add('paralisado');
    if (d.tipo === 'lentidao' && d.origem === 'congelamento') condicoes.add('congelado');
  }
  return [...condicoes];
}

/** Soma (%) dos bônus das condições que a habilidade usa e que estão ativas no alvo. */
export function bonusDanoPorStatus(
  condicoesAtivas: readonly CondicaoAlvo[],
  condicoesDaHabilidade: readonly CondicaoAlvo[] | undefined
): number {
  let total = 0;
  for (const c of new Set(condicoesDaHabilidade ?? [])) {
    if (condicoesAtivas.includes(c)) total += BONUS_DANO_POR_CONDICAO_PERCENTUAL[c];
  }
  return total;
}

/** Marca: +3% de dano por marca, no máximo +15%. */
export function bonusDanoPorMarcas(marcas: number | undefined): number {
  return Math.min(
    GAME_CONFIG.MARCA_BONUS_MAXIMO_PERCENTUAL,
    Math.max(0, Math.floor(marcas ?? 0)) * GAME_CONFIG.MARCA_BONUS_POR_MARCA_PERCENTUAL
  );
}

export const MARCAS_MAXIMAS = Math.floor(
  GAME_CONFIG.MARCA_BONUS_MAXIMO_PERCENTUAL / GAME_CONFIG.MARCA_BONUS_POR_MARCA_PERCENTUAL
);

/** Coloca marcas no alvo (cada golpe da habilidade marcadora = 1 marca), até o máximo que ainda soma bônus. */
export function adicionarMarcas(alvo: { marcas?: number }, quantidade: number): void {
  alvo.marcas = Math.min(MARCAS_MAXIMAS, (alvo.marcas ?? 0) + Math.max(0, Math.floor(quantidade)));
}

/** Sangramento e Maldição (instantâneos) deixam o alvo nesse estado até o fim da luta. */
export function registrarEstadoDeLuta(
  alvo: { estadosDeLuta?: EstadoDeLuta[] },
  efeito: EfeitoStatus
): void {
  if (efeito !== 'sangramento' && efeito !== 'maldicao') return;
  const atuais = alvo.estadosDeLuta ?? [];
  if (!atuais.includes(efeito)) alvo.estadosDeLuta = [...atuais, efeito];
}
