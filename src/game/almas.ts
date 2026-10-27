import { ATTRIBUTES, type Attributes } from '@/rules/attributes';
import {
  BONUS_DO_CONJUNTO_PERCENTUAL,
  CACOS_AO_DESTRUIR,
  CACOS_PARA_REFINAR,
  CARTAS_MAXIMAS,
  CUSTO_DO_DESPERTAR,
  ehEfeitoDeAtributo,
  ESPACOS_POR_CATEGORIA,
  NIVEL_DA_ALMA,
  NIVEL_MAXIMO_DO_DESPERTAR,
  podeDespertar,
  RARIDADES_DE_CARTA,
  sortearEfeito,
  TIPO_DE_CARTA_MAP,
  tiposDaRaridadeDeCarta,
  valorFixoDaCarta,
  type CartaItem,
  type EfeitoDeCarta,
} from '@/rules/almas';
import type { EmblemaRaridade } from '@/rules/emblemas';

/**
 * Sistema de Alma (7.8): operações puras sobre as cartas (sem banco). O servidor chama estas funções dentro de uma
 * transação e grava o resultado. As regras e os números estão em `rules/almas.ts`.
 */

export type MotivoBloqueioAlma =
  | 'nivelInsuficiente'
  | 'cartaNaoEncontrada'
  | 'jaEquipada'
  | 'naoEquipada'
  | 'categoriaCheia'
  | 'tipoJaEquipado'
  | 'equipadaNaoDestroi'
  | 'naoDesperta'
  | 'despertarMaximo'
  | 'copiasInsuficientes'
  | 'poeiraInsuficiente'
  | 'efeitoInvalido'
  | 'cacosInsuficientes'
  | 'nenhumaCarta';

export const MENSAGEM_BLOQUEIO_ALMA: Readonly<Record<MotivoBloqueioAlma, string>> = {
  nivelInsuficiente: `A aba Alma abre no nível ${NIVEL_DA_ALMA}.`,
  cartaNaoEncontrada: 'Carta não encontrada.',
  jaEquipada: 'Essa carta já está equipada.',
  naoEquipada: 'Essa carta não está equipada.',
  categoriaCheia: `Os ${ESPACOS_POR_CATEGORIA} espaços dessa categoria já estão ocupados. Desequipe uma carta primeiro.`,
  tipoJaEquipado: 'Você já tem uma carta desse tipo equipada.',
  equipadaNaoDestroi: 'Desequipe a carta antes de destruí-la.',
  naoDesperta: 'Só cartas lendárias e míticas podem ser despertadas.',
  despertarMaximo: 'Essa carta já está no despertar máximo.',
  copiasInsuficientes: 'Cópias insuficientes (as cópias precisam ser da mesma carta e não podem estar equipadas).',
  poeiraInsuficiente: 'Poeira de alma insuficiente.',
  efeitoInvalido: 'Escolha um efeito aleatório da carta.',
  cacosInsuficientes: 'Cacos de alma insuficientes.',
  nenhumaCarta: 'Escolha pelo menos uma carta.',
};

type Resultado<T> = ({ ok: true } & T) | { ok: false; motivo: MotivoBloqueioAlma };
const falha = (motivo: MotivoBloqueioAlma): { ok: false; motivo: MotivoBloqueioAlma } => ({ ok: false, motivo });

export function equiparCarta(itens: readonly CartaItem[], equipadas: readonly string[], itemId: unknown): Resultado<{ equipadas: string[] }> {
  const carta = typeof itemId === 'string' ? itens.find((i) => i.id === itemId) : undefined;
  if (!carta) return falha('cartaNaoEncontrada');
  if (equipadas.includes(carta.id)) return falha('jaEquipada');
  const categoria = TIPO_DE_CARTA_MAP[carta.tipo].categoria;
  const equipadasItens = equipadas.flatMap((id) => itens.find((i) => i.id === id) ?? []);
  if (equipadasItens.some((i) => i.tipo === carta.tipo)) return falha('tipoJaEquipado');
  if (equipadasItens.filter((i) => TIPO_DE_CARTA_MAP[i.tipo].categoria === categoria).length >= ESPACOS_POR_CATEGORIA) return falha('categoriaCheia');
  return { ok: true, equipadas: [...equipadas, carta.id] };
}

export function desequiparCarta(equipadas: readonly string[], itemId: unknown): Resultado<{ equipadas: string[] }> {
  if (typeof itemId !== 'string' || !equipadas.includes(itemId)) return falha('naoEquipada');
  return { ok: true, equipadas: equipadas.filter((id) => id !== itemId) };
}

/**
 * Desperta uma carta lendária ou mítica: gasta cópias da MESMA carta (fora dos espaços) e poeira de alma, e sobe um
 * nível de despertar (I, II, III). Devolve as cartas que sobraram.
 */
export function despertarCarta(
  itens: readonly CartaItem[],
  equipadas: readonly string[],
  poeira: number,
  itemId: unknown
): Resultado<{ itens: CartaItem[]; poeira: number; nivel: number }> {
  const carta = typeof itemId === 'string' ? itens.find((i) => i.id === itemId) : undefined;
  if (!carta) return falha('cartaNaoEncontrada');
  if (!podeDespertar(TIPO_DE_CARTA_MAP[carta.tipo].raridade)) return falha('naoDesperta');
  if (carta.despertar >= NIVEL_MAXIMO_DO_DESPERTAR) return falha('despertarMaximo');
  const custo = CUSTO_DO_DESPERTAR[carta.despertar];
  const copias = itens.filter((i) => i.tipo === carta.tipo && i.id !== carta.id && !equipadas.includes(i.id));
  if (copias.length < custo.copias) return falha('copiasInsuficientes');
  if (poeira < custo.poeira) return falha('poeiraInsuficiente');
  // As cópias que menos valem (menos despertadas) são as que se gastam
  const gastas = new Set([...copias].sort((a, b) => a.despertar - b.despertar).slice(0, custo.copias).map((c) => c.id));
  const nivel = carta.despertar + 1;
  return { ok: true, itens: itens.filter((i) => !gastas.has(i.id)).map((i) => (i.id === carta.id ? { ...i, despertar: nivel } : i)), poeira: poeira - custo.poeira, nivel };
}

/** Refina a carta: sorteia de novo UM efeito aleatório (o de índice `indice`) e gasta cacos de alma. */
export function refinarCarta(
  itens: readonly CartaItem[],
  cacos: number,
  itemId: unknown,
  indice: unknown,
  sorteio: () => number
): Resultado<{ itens: CartaItem[]; cacos: number; antes: CartaItem['efeitos'][number]; depois: CartaItem['efeitos'][number] }> {
  const carta = typeof itemId === 'string' ? itens.find((i) => i.id === itemId) : undefined;
  if (!carta) return falha('cartaNaoEncontrada');
  if (typeof indice !== 'number' || !Number.isInteger(indice) || indice < 0 || indice >= carta.efeitos.length) return falha('efeitoInvalido');
  const raridade = TIPO_DE_CARTA_MAP[carta.tipo].raridade;
  const custo = CACOS_PARA_REFINAR[raridade];
  if (cacos < custo) return falha('cacosInsuficientes');
  const antes = carta.efeitos[indice];
  const depois = sortearEfeito(raridade, sorteio);
  const efeitos = carta.efeitos.map((e, i) => (i === indice ? depois : e));
  return { ok: true, itens: itens.map((i) => (i.id === carta.id ? { ...i, efeitos } : i)), cacos: cacos - custo, antes, depois };
}

/** Destrói cartas (que não estejam equipadas) e dá cacos de alma pela raridade. */
export function destruirCartas(itens: readonly CartaItem[], equipadas: readonly string[], ids: unknown): Resultado<{ itens: CartaItem[]; cacos: number; destruidas: number }> {
  if (!Array.isArray(ids) || ids.length === 0) return falha('nenhumaCarta');
  const unicos = [...new Set(ids.filter((x): x is string => typeof x === 'string'))];
  let cacos = 0;
  for (const id of unicos) {
    const carta = itens.find((i) => i.id === id);
    if (!carta) return falha('cartaNaoEncontrada');
    if (equipadas.includes(id)) return falha('equipadaNaoDestroi');
    cacos += CACOS_AO_DESTRUIR[TIPO_DE_CARTA_MAP[carta.tipo].raridade];
  }
  const fora = new Set(unicos);
  return { ok: true, itens: itens.filter((i) => !fora.has(i.id)), cacos, destruidas: unicos.length };
}

/** Quantas cartas ainda cabem no inventário; o que passar vira cacos de alma na hora (ver `guardarCartas`). */
export function guardarCartas(itens: readonly CartaItem[], novas: readonly CartaItem[], espacosExtras = 0): { itens: CartaItem[]; cacosDoExcesso: number } {
  const cabem = Math.max(0, CARTAS_MAXIMAS + espacosExtras - itens.length);
  const guardadas = novas.slice(0, cabem);
  const cacosDoExcesso = novas.slice(cabem).reduce((s, c) => s + CACOS_AO_DESTRUIR[TIPO_DE_CARTA_MAP[c.tipo].raridade], 0);
  return { itens: [...itens, ...guardadas], cacosDoExcesso };
}

/** Os tipos de carta de cada conjunto (uma raridade): 9 cartas. */
export const CARTAS_DO_CONJUNTO = (raridade: EmblemaRaridade) => tiposDaRaridadeDeCarta(raridade);

/** Conjuntos completos: a raridade tem as 9 cartas descobertas. */
export function conjuntosCompletos(descobertas: readonly string[]): EmblemaRaridade[] {
  return RARIDADES_DE_CARTA.filter((r) => tiposDaRaridadeDeCarta(r).every((t) => descobertas.includes(t.id)));
}

/** O bônus de coleção total (em %), somando os conjuntos completos. */
export function bonusDaColecao(descobertas: readonly string[]): number {
  return conjuntosCompletos(descobertas).reduce((s, r) => s + BONUS_DO_CONJUNTO_PERCENTUAL[r], 0);
}

/** O que as cartas equipadas e a coleção somam na ficha: percentuais, pontos de atributo e HP (em %). */
export interface BonusDeAlma {
  atributos: Attributes;
  atqFisico: number;
  atqMagico: number;
  defesa: number;
  hp: number;
  agilidade: number;
  chanceCritico: number;
  chanceEfeitos: number;
}

export function bonusVazio(): BonusDeAlma {
  return { atributos: Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Attributes, atqFisico: 0, atqMagico: 0, defesa: 0, hp: 0, agilidade: 0, chanceCritico: 0, chanceEfeitos: 0 };
}

function somarEfeito(b: BonusDeAlma, efeito: EfeitoDeCarta, valor: number) {
  if (ehEfeitoDeAtributo(efeito)) b.atributos[efeito as keyof Attributes] += valor;
  else b[efeito as 'atqFisico'] += valor;
}

/**
 * Soma tudo: o efeito fixo (com o despertar) e os aleatórios das cartas equipadas, mais o bônus de coleção (só vale
 * a partir do nível da Alma, como as cartas). Bônus de coleção: +X% de ATQ (físico e mágico), DEF e HP.
 */
export function bonusDasCartas(itens: readonly CartaItem[], equipadas: readonly string[], descobertas: readonly string[], nivelDoPersonagem: number): BonusDeAlma {
  const b = bonusVazio();
  if (nivelDoPersonagem < NIVEL_DA_ALMA) return b;
  for (const id of equipadas) {
    const carta = itens.find((i) => i.id === id);
    const tipo = carta ? TIPO_DE_CARTA_MAP[carta.tipo] : undefined;
    if (!carta || !tipo) continue;
    somarEfeito(b, tipo.fixo, valorFixoDaCarta(carta));
    for (const e of carta.efeitos) somarEfeito(b, e.efeito, e.valor);
  }
  const colecao = bonusDaColecao(descobertas);
  b.atqFisico += colecao;
  b.atqMagico += colecao;
  b.defesa += colecao;
  b.hp += colecao;
  return b;
}

