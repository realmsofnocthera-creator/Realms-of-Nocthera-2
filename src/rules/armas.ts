import type { AttributeName } from './attributes';
import type { Elemento } from './elements';
import type { RaridadeMaterial } from './raridades';
import type { EfeitoStatus } from './statusEffects';

/**
 * Armas (decididas pelo Yuri em 12/10/2026), estilo Monster Hunter World:
 * - cada monstro tem uma árvore de armas, igual nas 6 categorias (164 armas base × 6 = 984);
 * - a arma tem dano fixo (físico ou mágico, pela categoria), bônus e penalidade da categoria
 *   e um atributo sorteado na fabricação (tipo fixo na árvore; os pontos saem da faixa da raridade);
 * - herda o elemento e o status do monstro (ou da subespécie do ramo);
 * - só as Míticas aceitam Customização.
 * Só dados e regras: a fabricação no servidor, o combate e as telas vêm nos próximos PRs.
 */

export type CategoriaArma = 'espadaGrande' | 'katana' | 'lanca' | 'espadaEscudo' | 'grimorio' | 'cajado';

export type RaridadeArma = RaridadeMaterial | 'mitico';

export type TipoDanoArma = 'fisico' | 'magico';

/** O que o bônus ou a penalidade da categoria altera (percentual sobre o total do personagem, regra 1.2.2). */
export type AlvoModificadorArma =
  | 'danoFisico'
  | 'danoMagico'
  | 'agilidade'
  | 'chanceCritico'
  | 'defesa' // mitigação física e mágica
  | 'chanceEfeitos';

export interface ModificadorArma {
  alvo: AlvoModificadorArma;
  percentual: number;
}

export interface DefinicaoCategoriaArma {
  id: CategoriaArma;
  nome: string;
  tipoDano: TipoDanoArma;
  /** Subtipo do dano físico que o combate já entende; as mágicas não têm. */
  subtipoFisico?: 'corte' | 'perfuracao';
  bonus: ModificadorArma;
  penalidade: ModificadorArma;
}

export const CATEGORIAS_ARMA: readonly DefinicaoCategoriaArma[] = [
  {
    id: 'espadaGrande',
    nome: 'Espada grande',
    tipoDano: 'fisico',
    subtipoFisico: 'corte',
    bonus: { alvo: 'danoFisico', percentual: 10 },
    penalidade: { alvo: 'agilidade', percentual: -10 },
  },
  {
    id: 'katana',
    nome: 'Katana',
    tipoDano: 'fisico',
    subtipoFisico: 'corte',
    bonus: { alvo: 'chanceCritico', percentual: 5 },
    penalidade: { alvo: 'defesa', percentual: -5 },
  },
  {
    id: 'lanca',
    nome: 'Lança',
    tipoDano: 'fisico',
    subtipoFisico: 'perfuracao',
    bonus: { alvo: 'defesa', percentual: 10 },
    penalidade: { alvo: 'agilidade', percentual: -10 },
  },
  {
    id: 'espadaEscudo',
    nome: 'Espada e escudo',
    tipoDano: 'fisico',
    subtipoFisico: 'corte',
    bonus: { alvo: 'agilidade', percentual: 10 },
    penalidade: { alvo: 'danoFisico', percentual: -10 },
  },
  {
    id: 'grimorio',
    nome: 'Grimório',
    tipoDano: 'magico',
    bonus: { alvo: 'chanceEfeitos', percentual: 10 },
    penalidade: { alvo: 'defesa', percentual: -10 },
  },
  {
    id: 'cajado',
    nome: 'Cajado',
    tipoDano: 'magico',
    bonus: { alvo: 'danoMagico', percentual: 10 },
    penalidade: { alvo: 'defesa', percentual: -10 },
  },
];

export const CATEGORIAS_ARMA_MAP: Readonly<Record<CategoriaArma, DefinicaoCategoriaArma>> = Object.fromEntries(
  CATEGORIAS_ARMA.map((c) => [c.id, c])
) as Record<CategoriaArma, DefinicaoCategoriaArma>;

export interface DefinicaoRaridadeArma {
  id: RaridadeArma;
  nome: string;
  /** Faixa de pontos do atributo sorteado (inteiros, sorteio uniforme). */
  pontosMin: number;
  pontosMax: number;
}

export const RARIDADES_ARMA: readonly DefinicaoRaridadeArma[] = [
  { id: 'comum', nome: 'Comum', pontosMin: 1, pontosMax: 9 },
  { id: 'raro', nome: 'Raro', pontosMin: 10, pontosMax: 20 },
  { id: 'muitoRaro', nome: 'Muito raro', pontosMin: 21, pontosMax: 40 },
  { id: 'epico', nome: 'Épico', pontosMin: 41, pontosMax: 65 },
  { id: 'lendario', nome: 'Lendário', pontosMin: 66, pontosMax: 100 },
  { id: 'mitico', nome: 'Mítico', pontosMin: 101, pontosMax: 150 },
];

export const RARIDADES_ARMA_MAP: Readonly<Record<RaridadeArma, DefinicaoRaridadeArma>> = Object.fromEntries(
  RARIDADES_ARMA.map((r) => [r.id, r])
) as Record<RaridadeArma, DefinicaoRaridadeArma>;

/** Base de dano fixo por estrela: os pontos de referência do caçador no nível mínimo da estrela. */
export const DANO_FIXO_POR_ESTRELA: Readonly<Record<number, number>> = {
  1: 17,
  2: 26,
  3: 35,
  4: 47,
  5: 59,
  6: 111,
  7: 120,
  8: 129,
  9: 141,
};

/** Arma sem elemento e sem status ganha este % no dano fixo. */
export const BONUS_SEM_ELEMENTO_NEM_STATUS_PERCENTUAL = 20;
/** A arma com elemento soma este % no dano daquele elemento. */
export const BONUS_ELEMENTO_ARMA_PERCENTUAL = 10;
/** Na 9★ (sem estrela seguinte), cada arma da árvore sobe este %. */
export const SUBIDA_POR_ARMA_9_ESTRELAS_PERCENTUAL = 5;

/**
 * Dano fixo de uma arma: a base da estrela, subindo 1/3 do caminho até a base da estrela seguinte
 * a cada arma da árvore (na 9★, +5% por arma). Igual nas 6 categorias.
 */
export function danoFixoDaArma(estrela: number, posicao: number, semElementoNemStatus = false): number {
  const base = DANO_FIXO_POR_ESTRELA[estrela];
  if (base === undefined) throw new Error(`Estrela inválida: ${estrela}`);
  if (!Number.isInteger(posicao) || posicao < 1) throw new Error(`Posição inválida: ${posicao}`);
  const proxima = DANO_FIXO_POR_ESTRELA[estrela + 1];
  const dano =
    proxima === undefined
      ? base * (1 + (SUBIDA_POR_ARMA_9_ESTRELAS_PERCENTUAL / 100) * (posicao - 1))
      : base + ((proxima - base) * (posicao - 1)) / 3;
  const fator = semElementoNemStatus ? 1 + BONUS_SEM_ELEMENTO_NEM_STATUS_PERCENTUAL / 100 : 1;
  return Math.round(dano * fator);
}

/** Atributo que o dano fixo representa: Força nas físicas, Inteligência nas mágicas. */
export function atributoDoDanoFixo(categoria: CategoriaArma): AttributeName {
  return CATEGORIAS_ARMA_MAP[categoria].tipoDano === 'fisico' ? 'forca' : 'inteligencia';
}

/** Os 6 atributos que podem sair no sorteio (todos, menos o do dano fixo). Sorteio ruim é permitido. */
export function atributosSorteaveis(categoria: CategoriaArma): AttributeName[] {
  const fixo = atributoDoDanoFixo(categoria);
  const todos: AttributeName[] = ['vigor', 'sorte', 'forca', 'vitalidade', 'arcano', 'inteligencia', 'agilidade'];
  return todos.filter((a) => a !== fixo);
}

/** Inteiro uniforme em [min, max] a partir de um gerador em [0, 1). */
function inteiroEntre(min: number, max: number, aleatorio: () => number): number {
  return min + Math.min(max - min, Math.floor(aleatorio() * (max - min + 1)));
}

/** Tipo do atributo sorteado na primeira arma da árvore (depois fica fixo ao evoluir). */
export function sortearAtributoDaArma(categoria: CategoriaArma, aleatorio: () => number): AttributeName {
  const opcoes = atributosSorteaveis(categoria);
  return opcoes[inteiroEntre(0, opcoes.length - 1, aleatorio)];
}

/** Pontos do atributo sorteado (ao fabricar, evoluir ou reforjar). */
export function sortearPontosDaArma(raridade: RaridadeArma, aleatorio: () => number): number {
  const r = RARIDADES_ARMA_MAP[raridade];
  return inteiroEntre(r.pontosMin, r.pontosMax, aleatorio);
}

/** Reforjar: 50% da receita e do ouro, mais 25% a cada reforja já feita na arma, até 200%. */
export const REFORJA_CUSTO_BASE_PERCENTUAL = 50;
export const REFORJA_CUSTO_POR_REFORJA_PERCENTUAL = 25;
export const REFORJA_CUSTO_MAXIMO_PERCENTUAL = 200;

export function percentualCustoReforja(reforjasFeitas: number): number {
  return Math.min(
    REFORJA_CUSTO_MAXIMO_PERCENTUAL,
    REFORJA_CUSTO_BASE_PERCENTUAL + REFORJA_CUSTO_POR_REFORJA_PERCENTUAL * Math.max(0, reforjasFeitas)
  );
}

/** Customização (só Mítico): até +20 pontos, cada um por 20.000 de ouro e 1 Bilhete de melhoria. */
export const CUSTOMIZACAO = {
  pontosMaximos: 20,
  ouroPorPonto: 20000,
  bilhetesPorPonto: 1,
  /** Chance de o Bilhete de melhoria cair em qualquer monstro 9★, por vitória. */
  chanceBilhete9EstrelasPercentual: 1,
  /** Cada ponto em Dano: +2% no dano fixo da arma. */
  danoPercentualPorPonto: 2,
  /** Cada ponto em Atributo secundário: +1 ponto no atributo sorteado. */
  atributoPorPonto: 1,
  /** Cada ponto em Mais status: +0,5 ponto percentual na chance do status (só arma com status). */
  statusPontosPercentuaisPorPonto: 0.5,
} as const;

export type OpcaoCustomizacao = 'dano' | 'atributo' | 'status';

export function podeCustomizar(raridade: RaridadeArma): boolean {
  return raridade === 'mitico';
}

export interface ItemReceita {
  id: string;
  qtd: number;
}

export interface ReceitaArma {
  /** Materiais da Caçada (`MATERIAIS`): do monstro ou da subespécie do ramo. */
  materiaisMonstro: readonly ItemReceita[];
  /** Ossos, minérios e plantas de `MATERIAIS_MUNDO`. */
  materiaisMundo: readonly ItemReceita[];
  /** Diversos de mundo: qualquer um dos dois da raridade. */
  diversos: { raridade: RaridadeMaterial; qtd: number } | null;
  ouro: number;
}

export interface ArmaBase {
  id: string;
  estrela: number;
  monstroId: string;
  /** `principal` ou o id da subespécie do ramo. */
  parte: string;
  /** Posição na árvore do monstro (o ramo continua a contagem da principal). */
  posicao: number;
  raridade: RaridadeArma;
  nomes: Readonly<Record<CategoriaArma, string>>;
  elementos: readonly Elemento[];
  status: readonly EfeitoStatus[];
  semElementoNemStatus?: true;
  /** Arma anterior da árvore, consumida na fabricação (null na primeira). */
  consome: string | null;
  receita: ReceitaArma;
}
