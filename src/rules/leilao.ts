import type { ItemDoAnuncio, CategoriaDoMercado, MoedaDoMercado, RaridadeDoMercado } from './mercado';

/**
 * Leilão (7.2, decidido pelo Yuri em 24 e 25/10/2026). Segunda, quarta, sexta, sábado e domingo, das 19h às 20h de
 * Brasília: 10 itens sorteados pelo jogo, 5 minutos cada. O lance mínimo é por raridade e cada lance novo vale 10% a mais
 * que o anterior. Um lance nos últimos 15 segundos estende o item em 15 segundos. O valor do lance fica reservado (sai
 * do saldo) e volta se alguém cobrir; o do vencedor some da economia. O item chega pelo Correio.
 *
 * Nada mítico e nenhum selo de busca. Até Épico, os lances são em ouro; Lendário, em Diamantes.
 * O sorteio (pesos de categoria e de raridade) e os lances mínimos são proposta, a confirmar.
 */

export const NIVEL_DO_LEILAO = 2;
/** Dias da semana com leilão (0 = domingo). */
export const DIAS_DO_LEILAO: readonly number[] = [1, 3, 5, 6, 0];
export const HORA_DE_INICIO_EM_BRASILIA = 19;
export const ITENS_POR_LEILAO = 10;
export const MINUTOS_POR_ITEM = 5;
export const PRORROGACAO_MS = 15_000;
export const AUMENTO_POR_LANCE_PERCENTUAL = 10;

/** Moeda e lance mínimo por raridade (proposta, a confirmar). */
export const LANCE_MINIMO: Readonly<Record<Exclude<RaridadeDoMercado, 'mitico'>, { moeda: MoedaDoMercado; valor: number }>> = {
  comum: { moeda: 'ouro', valor: 300 },
  raro: { moeda: 'ouro', valor: 1_000 },
  muitoRaro: { moeda: 'ouro', valor: 3_000 },
  epico: { moeda: 'ouro', valor: 8_000 },
  lendario: { moeda: 'diamantes', valor: 30 },
};

/** Chance de cada raridade no sorteio, em % (proposta, a confirmar). */
export const PESO_DA_RARIDADE: Readonly<Record<Exclude<RaridadeDoMercado, 'mitico'>, number>> = {
  comum: 25,
  raro: 25,
  muitoRaro: 20,
  epico: 18,
  lendario: 12,
};

/** Chance de cada categoria no sorteio, em % (proposta, a confirmar). */
export const PESO_DA_CATEGORIA: Readonly<Partial<Record<CategoriaDoMercado, number>>> = {
  carta: 25,
  emblema: 25,
  arma: 20,
  armadura: 20,
  material: 10,
};
/** Os materiais vão em lote. */
export const LOTE_DE_MATERIAL = 20;

export interface LanceDoLeilao {
  uid: string;
  nome: string;
  valor: number;
  em: string;
}

export interface ItemDoLeilao {
  indice: number;
  item: ItemDoAnuncio;
  categoria: CategoriaDoMercado;
  raridade: RaridadeDoMercado;
  nome: string;
  detalhe: string;
  quantidade: number;
  moeda: MoedaDoMercado;
  minimo: number;
  inicio: string;
  /** Fim do item (cresce com lance nos últimos 15 segundos). */
  fim: string;
  lance?: LanceDoLeilao;
  /** O item já foi entregue ao vencedor (ou o leilão dele acabou sem lance). */
  fechado?: boolean;
}

/** leilao/{dia}: o leilão de um dia. */
export interface LeilaoDoDia {
  dia: string;
  itens: ItemDoLeilao[];
}

/** O dia da semana (0 = domingo) de uma data AAAA-MM-DD. */
export const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00.000Z`).getUTCDay();
export const temLeilao = (dia: string) => DIAS_DO_LEILAO.includes(diaDaSemana(dia));

/** Quando começa o item `indice` do leilão do dia (19h de Brasília = 22h UTC). */
export function inicioDoItem(dia: string, indice: number): Date {
  return new Date(Date.parse(`${dia}T${String(HORA_DE_INICIO_EM_BRASILIA + 3).padStart(2, '0')}:00:00.000Z`) + indice * MINUTOS_POR_ITEM * 60_000);
}

export type SituacaoDoItem = 'aguardando' | 'aberto' | 'encerrado';
export function situacaoDoItem(i: Pick<ItemDoLeilao, 'inicio' | 'fim'>, agora: Date): SituacaoDoItem {
  if (agora.getTime() < Date.parse(i.inicio)) return 'aguardando';
  if (agora.getTime() < Date.parse(i.fim)) return 'aberto';
  return 'encerrado';
}

/** O valor do próximo lance: o mínimo, ou 10% acima do atual (arredondado para cima). */
export function proximoLance(i: Pick<ItemDoLeilao, 'minimo' | 'lance'>): number {
  return i.lance ? Math.ceil((i.lance.valor * (100 + AUMENTO_POR_LANCE_PERCENTUAL)) / 100) : i.minimo;
}

/** O fim do item depois de um lance: se faltavam menos de 15 segundos, passa a ser daqui a 15 segundos. */
export function fimDepoisDoLance(fim: string, agora: Date): string {
  return Date.parse(fim) - agora.getTime() < PRORROGACAO_MS ? new Date(agora.getTime() + PRORROGACAO_MS).toISOString() : fim;
}

/** O próximo dia com leilão a partir de `dia` (o próprio, se tiver). */
export function proximoDiaDeLeilao(dia: string): string {
  let d = new Date(`${dia}T12:00:00.000Z`);
  for (let i = 0; i < 7; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (temLeilao(iso)) return iso;
    d = new Date(d.getTime() + 86_400_000);
  }
  return dia;
}

/** Escolhe por peso (os pesos somam 100 ou não: é proporcional). `valor` em [0, 1). */
export function porPeso<T extends string>(pesos: Readonly<Partial<Record<T, number>>>, valor: number): T {
  const entradas = Object.entries(pesos) as [T, number][];
  const total = entradas.reduce((s, [, p]) => s + p, 0);
  let alvo = valor * total;
  for (const [k, p] of entradas) {
    if (alvo < p) return k;
    alvo -= p;
  }
  return entradas[entradas.length - 1][0];
}

export function leilaoDoDocumento(dia: string, bruto: unknown): LeilaoDoDia | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const itens = (bruto as Record<string, unknown>).itens;
  if (!Array.isArray(itens)) return null;
  return { dia, itens: itens.filter((i): i is ItemDoLeilao => !!i && typeof i === 'object' && typeof (i as ItemDoLeilao).inicio === 'string' && typeof (i as ItemDoLeilao).fim === 'string') };
}
