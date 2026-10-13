import type { AttributeName } from './attributes';
import type { RaridadeMaterial } from './raridades';
import { DANO_FIXO_POR_ESTRELA, RaridadeArma, ReceitaArma } from './armas';

/**
 * Armaduras (decididas pelo Yuri em 13/10/2026):
 * - 5 espaços; cada peça dá um atributo fixo (pelo espaço) e um atributo sorteado (Arcano, Vigor ou Vitalidade);
 * - raridades de Comum a Mítico, como as armas; sem árvore: cada peça é forjada direto dos materiais;
 * - o conjunto tem de 7 (Comum) a 12 (Mítico) níveis de habilidade, com pelo menos 1 em cada peça; níveis iguais
 *   de peças e conjuntos diferentes se somam até o nível máximo da habilidade;
 * - sem Customização: a peça sobe do nível 0 ao 30 com XP de armadura (orbes), +1% no atributo fixo por nível.
 * Só dados e regras: o servidor, a tela e o combate vêm nos próximos PRs.
 */

export type EspacoArmadura = 'elmo' | 'peitoral' | 'luvas' | 'perneiras' | 'botas';

export type EstiloArmadura = 'fisico' | 'veloz' | 'guardiao' | 'arcano';

/** Atributo fixo da peça: Vida (HP), Defesa (mitigação física e mágica) ou Agilidade. */
export type AtributoFixoArmadura = 'vida' | 'defesa' | 'agilidade';

export interface DefinicaoEspacoArmadura {
  id: EspacoArmadura;
  nome: string;
  fixo: AtributoFixoArmadura;
  /** Parte da base da estrela que vira o atributo fixo. */
  parteDaBase: number;
}

/** HP por ponto de Vida da armadura (o mesmo do Vigor). */
export const HP_POR_PONTO_VIDA_ARMADURA = 5;

export const ESPACOS_ARMADURA: readonly DefinicaoEspacoArmadura[] = [
  { id: 'elmo', nome: 'Elmo', fixo: 'vida', parteDaBase: 0.2 },
  { id: 'peitoral', nome: 'Peitoral', fixo: 'defesa', parteDaBase: 0.3 },
  { id: 'luvas', nome: 'Luvas', fixo: 'vida', parteDaBase: 0.125 },
  { id: 'perneiras', nome: 'Perneiras', fixo: 'defesa', parteDaBase: 0.25 },
  { id: 'botas', nome: 'Botas', fixo: 'agilidade', parteDaBase: 0.125 },
];

export const ESPACOS_ARMADURA_MAP: Readonly<Record<EspacoArmadura, DefinicaoEspacoArmadura>> = Object.fromEntries(
  ESPACOS_ARMADURA.map((e) => [e.id, e])
) as Record<EspacoArmadura, DefinicaoEspacoArmadura>;

export const NIVEL_MAXIMO_ARMADURA = 30;
/** Cada nível da peça soma este % no atributo fixo. */
export const BONUS_FIXO_POR_NIVEL_PERCENTUAL = 1;

/** Atributo fixo da peça (Vida em HP, Defesa em mitigação, Agilidade em pontos) no nível dela. */
export function fixoDaPeca(estrela: number, espaco: EspacoArmadura, nivel = 0): number {
  const base = DANO_FIXO_POR_ESTRELA[estrela];
  if (base === undefined) throw new Error(`Estrela inválida: ${estrela}`);
  const def = ESPACOS_ARMADURA_MAP[espaco];
  const pontos = base * def.parteDaBase * (def.fixo === 'vida' ? HP_POR_PONTO_VIDA_ARMADURA : 1);
  const n = Math.max(0, Math.min(NIVEL_MAXIMO_ARMADURA, Math.floor(nivel)));
  return Math.round((Math.round(pontos) * (100 + n * BONUS_FIXO_POR_NIVEL_PERCENTUAL)) / 100);
}

/** O atributo sorteado da armadura sai só entre estes três. */
export const ATRIBUTOS_SORTEAVEIS_ARMADURA: readonly AttributeName[] = ['arcano', 'vigor', 'vitalidade'];

/** Faixa de pontos do atributo sorteado, por peça. */
export const FAIXA_SORTEIO_ARMADURA: Readonly<Record<RaridadeArma, { min: number; max: number }>> = {
  comum: { min: 1, max: 3 },
  raro: { min: 3, max: 6 },
  muitoRaro: { min: 6, max: 12 },
  epico: { min: 12, max: 20 },
  lendario: { min: 20, max: 30 },
  mitico: { min: 30, max: 45 },
};

/** Níveis de habilidade do conjunto inteiro (5 peças), pela raridade. */
export const NIVEIS_HABILIDADE_CONJUNTO: Readonly<Record<RaridadeArma, number>> = {
  comum: 7,
  raro: 8,
  muitoRaro: 9,
  epico: 10,
  lendario: 11,
  mitico: 12,
};

function inteiroEntre(min: number, max: number, aleatorio: () => number): number {
  return min + Math.min(max - min, Math.floor(aleatorio() * (max - min + 1)));
}

export function sortearAtributoDaArmadura(aleatorio: () => number): AttributeName {
  return ATRIBUTOS_SORTEAVEIS_ARMADURA[inteiroEntre(0, ATRIBUTOS_SORTEAVEIS_ARMADURA.length - 1, aleatorio)];
}

export function sortearPontosDaArmadura(raridade: RaridadeArma, aleatorio: () => number): number {
  const f = FAIXA_SORTEIO_ARMADURA[raridade];
  return inteiroEntre(f.min, f.max, aleatorio);
}

// ---------------------------------------------------------------------------
// XP de armadura e orbes
// ---------------------------------------------------------------------------

/** XP total para levar uma peça do nível 0 ao 30. */
export const XP_TOTAL_ARMADURA = 10000;

/** XP para subir do nível n−1 ao n: cerca de 21,5 × n; o nível 30 fecha os 10.000. */
export const XP_POR_NIVEL_ARMADURA: readonly number[] = (() => {
  const custos: number[] = [];
  for (let n = 1; n < NIVEL_MAXIMO_ARMADURA; n++) custos.push(Math.round(21.5 * n));
  custos.push(XP_TOTAL_ARMADURA - custos.reduce((s, c) => s + c, 0));
  return custos;
})();

/** XP acumulado para chegar ao nível n (0 no nível 0). */
export function xpAcumuladoAteNivel(nivel: number): number {
  const n = Math.max(0, Math.min(NIVEL_MAXIMO_ARMADURA, Math.floor(nivel)));
  return XP_POR_NIVEL_ARMADURA.slice(0, n).reduce((s, c) => s + c, 0);
}

/** Nível da peça com este XP acumulado (o XP para no total do nível 30). */
export function nivelDoXpArmadura(xp: number): number {
  let nivel = 0;
  while (nivel < NIVEL_MAXIMO_ARMADURA && xp >= xpAcumuladoAteNivel(nivel + 1)) nivel++;
  return nivel;
}

export interface OrbeArmadura {
  id: string;
  nome: string;
  /** Raridade de drop: usa as mesmas chances e tetos por estrela dos materiais. */
  raridade: RaridadeMaterial;
  xp: number;
}

export const ORBES_ARMADURA: readonly OrbeArmadura[] = [
  { id: 'orbe-de-armadura', nome: 'Orbe de Armadura', raridade: 'comum', xp: 10 },
  { id: 'orbe-de-armadura-reforcado', nome: 'Orbe de Armadura Reforçado', raridade: 'raro', xp: 50 },
  { id: 'orbe-de-armadura-superior', nome: 'Orbe de Armadura Superior', raridade: 'muitoRaro', xp: 200 },
  { id: 'orbe-de-armadura-ancestral', nome: 'Orbe de Armadura Ancestral', raridade: 'epico', xp: 500 },
  { id: 'orbe-de-armadura-regio', nome: 'Orbe de Armadura Régio', raridade: 'lendario', xp: 1000 },
];

export const ORBES_ARMADURA_MAP: Readonly<Record<string, OrbeArmadura>> = Object.fromEntries(
  ORBES_ARMADURA.map((o) => [o.id, o])
);

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export interface HabilidadeDaPeca {
  id: string;
  nivel: number;
}

export interface PecaArmadura {
  id: string;
  /** Conjunto (o monstro ou a subespécie; os Míticos dos 9★ terminam em `-mitico`). */
  conjuntoId: string;
  /** Monstro da Caçada de onde saem os materiais. */
  monstroId: string;
  estrela: number;
  raridade: RaridadeArma;
  estilo: EstiloArmadura;
  espaco: EspacoArmadura;
  nome: string;
  habilidades: readonly HabilidadeDaPeca[];
  /** Mesma forma da receita das armas (sem arma consumida). */
  receita: ReceitaArma;
}

/** Soma os níveis de habilidade de várias peças, limitando cada habilidade ao nível máximo dela. */
export function somarHabilidades(
  pecas: readonly Pick<PecaArmadura, 'habilidades'>[],
  nivelMaximo: (id: string) => number
): Record<string, number> {
  const total: Record<string, number> = {};
  for (const p of pecas) for (const h of p.habilidades) total[h.id] = (total[h.id] ?? 0) + h.nivel;
  for (const id of Object.keys(total)) total[id] = Math.min(total[id], nivelMaximo(id));
  return total;
}
