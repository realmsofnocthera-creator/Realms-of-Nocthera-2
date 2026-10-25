import { TIPOS_DE_CARTA } from './almas';
import { TIPOS_EMBLEMA } from './emblemasCatalogo';
import { MATERIAIS } from './materiais';
import { NOME_DO_RECURSO, RARIDADE_DO_RECURSO, type RaridadeDoMercado, type RecursoFixo } from './mercado';

/**
 * Loja normal (7.2, decidida pelo Yuri em 25/10/2026). Abas por tipo de item, nada acima do Épico, sem armas e
 * armaduras; o jogador só compra. Uma parte gira toda segunda-feira à meia-noite de Brasília (a mesma para todos) e o
 * limite de compra é por item e zera no dia 1 de cada mês. Abre no nível 2. Os itens, os preços e os limites são
 * proposta do Claude, aprovada pelo Yuri em 25/10/2026.
 */

export const NIVEL_DA_LOJA = 2;

export const ABAS_DA_LOJA = ['materiais', 'recursos', 'cartas', 'emblemas', 'essencia'] as const;
export type AbaDaLoja = (typeof ABAS_DA_LOJA)[number];
export const NOME_DA_ABA: Readonly<Record<AbaDaLoja, string>> = {
  materiais: 'Materiais',
  recursos: 'Recursos',
  cartas: 'Cartas',
  emblemas: 'Emblemas',
  essencia: 'Essência de Soberano',
};

export type MoedaDaLoja = 'ouro' | 'diamantes' | 'essenciaDeSoberano';
type RaridadeDaLoja = Exclude<RaridadeDoMercado, 'lendario' | 'mitico'>;

/** O que o produto entrega: um material, um recurso, uma carta, um emblema ou um baú de escolha (épico). */
export type TipoDoProduto = 'material' | 'recurso' | 'carta' | 'emblema' | 'escolhaCarta' | 'escolhaEmblema';

export interface ProdutoDaLoja {
  /** `aba:id`: identifica o produto e o limite do mês. */
  chave: string;
  aba: AbaDaLoja;
  tipo: TipoDoProduto;
  /** O id do material, do recurso, do tipo de carta ou do tipo de emblema (vazio nos baús de escolha). */
  id: string;
  nome: string;
  raridade: RaridadeDoMercado;
  moeda: MoedaDaLoja;
  /** O preço de 1 unidade. */
  preco: number;
  limiteMensal: number;
  /** Faz parte da rotação da semana. */
  daSemana: boolean;
}

const PRECO_DO_MATERIAL: Readonly<Record<RaridadeDaLoja, { preco: number; limite: number }>> = {
  comum: { preco: 50, limite: 100 },
  raro: { preco: 150, limite: 50 },
  muitoRaro: { preco: 400, limite: 20 },
  epico: { preco: 1_000, limite: 5 },
};
/** Quantos materiais da Caçada de cada raridade entram na rotação (8 por semana). */
const MATERIAIS_DA_SEMANA: Readonly<Record<RaridadeDaLoja, number>> = { comum: 2, raro: 2, muitoRaro: 2, epico: 2 };

const RECURSOS: readonly { id: RecursoFixo; moeda: MoedaDaLoja; preco: number; limite: number }[] = [
  { id: 'selo:desgastado', moeda: 'ouro', preco: 200, limite: 50 },
  { id: 'selo:encantado', moeda: 'ouro', preco: 1_500, limite: 10 },
  { id: 'fragmentosDeMemoria', moeda: 'ouro', preco: 100, limite: 100 },
  { id: 'cacosDeAlma', moeda: 'ouro', preco: 100, limite: 50 },
  { id: 'poeiraDeAlma', moeda: 'ouro', preco: 300, limite: 30 },
  { id: 'essenciaHabilidade', moeda: 'ouro', preco: 500, limite: 30 },
  { id: 'fragmentosAlma', moeda: 'ouro', preco: 1_000, limite: 20 },
  { id: 'fragmentosAscensao', moeda: 'diamantes', preco: 15, limite: 5 },
  { id: 'pedrasDaRecordacao', moeda: 'diamantes', preco: 20, limite: 3 },
];

const PRECO_DA_CARTA: Readonly<Record<RaridadeDaLoja, { moeda: MoedaDaLoja; preco: number }>> = {
  comum: { moeda: 'ouro', preco: 2_000 },
  raro: { moeda: 'ouro', preco: 5_000 },
  muitoRaro: { moeda: 'ouro', preco: 12_000 },
  epico: { moeda: 'diamantes', preco: 40 },
};
const LIMITE_DA_CARTA = 2;
/** 6 cartas por semana: 2 comuns, 2 raras, 1 muito rara e 1 épica. */
const CARTAS_DA_SEMANA: Readonly<Record<RaridadeDaLoja, number>> = { comum: 2, raro: 2, muitoRaro: 1, epico: 1 };

const PRECO_DO_EMBLEMA: Readonly<Record<RaridadeDaLoja, { moeda: MoedaDaLoja; preco: number }>> = {
  comum: { moeda: 'ouro', preco: 3_000 },
  raro: { moeda: 'ouro', preco: 8_000 },
  muitoRaro: { moeda: 'ouro', preco: 20_000 },
  epico: { moeda: 'diamantes', preco: 60 },
};
const LIMITE_DO_EMBLEMA = 1;
/** 4 emblemas de 1 estrela por semana: 1 de cada raridade. */
const EMBLEMAS_DA_SEMANA: Readonly<Record<RaridadeDaLoja, number>> = { comum: 1, raro: 1, muitoRaro: 1, epico: 1 };

const DA_ESSENCIA: readonly { tipo: TipoDoProduto; id: string; nome: string; raridade: RaridadeDoMercado; preco: number; limite: number }[] = [
  { tipo: 'recurso', id: 'selo:encantado', nome: NOME_DO_RECURSO['selo:encantado'], raridade: RARIDADE_DO_RECURSO['selo:encantado'], preco: 10, limite: 20 },
  { tipo: 'recurso', id: 'fragmentosAscensao', nome: NOME_DO_RECURSO.fragmentosAscensao, raridade: RARIDADE_DO_RECURSO.fragmentosAscensao, preco: 20, limite: 10 },
  { tipo: 'recurso', id: 'pedrasDaRecordacao', nome: NOME_DO_RECURSO.pedrasDaRecordacao, raridade: RARIDADE_DO_RECURSO.pedrasDaRecordacao, preco: 30, limite: 5 },
  { tipo: 'escolhaCarta', id: '', nome: 'Baú de escolha de carta épica', raridade: 'epico', preco: 300, limite: 1 },
  { tipo: 'escolhaEmblema', id: '', nome: 'Baú de escolha de emblema épico', raridade: 'epico', preco: 400, limite: 1 },
];

const RARIDADES_DA_LOJA: readonly RaridadeDaLoja[] = ['comum', 'raro', 'muitoRaro', 'epico'];

/** As cartas e os emblemas épicos que os baús de escolha deixam escolher. */
export const CARTAS_EPICAS = TIPOS_DE_CARTA.filter((t) => t.raridade === 'epico');
export const EMBLEMAS_EPICOS = TIPOS_EMBLEMA.filter((t) => t.raridade === 'epico');

/** O sorteador da semana (o mesmo para todos): a semente vem da segunda-feira em que a semana começa. */
function sorteadorDaSemana(semana: string): () => number {
  let a = 2166136261;
  for (const c of `loja:${semana}`) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Escolhe `n` itens diferentes da lista. */
function escolher<T>(lista: readonly T[], n: number, sorteio: () => number): T[] {
  const resto = [...lista];
  const saida: T[] = [];
  while (saida.length < n && resto.length) saida.push(resto.splice(Math.floor(sorteio() * resto.length), 1)[0]);
  return saida;
}

/** O catálogo da semana: a parte fixa e a rotação (materiais, cartas e emblemas). */
export function catalogoDaSemana(semana: string): ProdutoDaLoja[] {
  const sorteio = sorteadorDaSemana(semana);
  const produtos: ProdutoDaLoja[] = [];
  for (const r of RARIDADES_DA_LOJA)
    for (const m of escolher(MATERIAIS.filter((x) => x.raridade === r), MATERIAIS_DA_SEMANA[r], sorteio))
      produtos.push({ chave: `materiais:${m.id}`, aba: 'materiais', tipo: 'material', id: m.id, nome: m.nome, raridade: r, moeda: 'ouro', preco: PRECO_DO_MATERIAL[r].preco, limiteMensal: PRECO_DO_MATERIAL[r].limite, daSemana: true });
  for (const x of RECURSOS)
    produtos.push({ chave: `recursos:${x.id}`, aba: 'recursos', tipo: 'recurso', id: x.id, nome: NOME_DO_RECURSO[x.id], raridade: RARIDADE_DO_RECURSO[x.id], moeda: x.moeda, preco: x.preco, limiteMensal: x.limite, daSemana: false });
  for (const r of RARIDADES_DA_LOJA)
    for (const t of escolher(TIPOS_DE_CARTA.filter((x) => x.raridade === r), CARTAS_DA_SEMANA[r], sorteio))
      produtos.push({ chave: `cartas:${t.id}`, aba: 'cartas', tipo: 'carta', id: t.id, nome: t.nome, raridade: r, moeda: PRECO_DA_CARTA[r].moeda, preco: PRECO_DA_CARTA[r].preco, limiteMensal: LIMITE_DA_CARTA, daSemana: true });
  for (const r of RARIDADES_DA_LOJA)
    for (const t of escolher(TIPOS_EMBLEMA.filter((x) => x.raridade === r), EMBLEMAS_DA_SEMANA[r], sorteio))
      produtos.push({ chave: `emblemas:${t.id}`, aba: 'emblemas', tipo: 'emblema', id: t.id, nome: t.nome, raridade: r, moeda: PRECO_DO_EMBLEMA[r].moeda, preco: PRECO_DO_EMBLEMA[r].preco, limiteMensal: LIMITE_DO_EMBLEMA, daSemana: true });
  for (const x of DA_ESSENCIA)
    produtos.push({ chave: `essencia:${x.tipo === 'recurso' ? x.id : x.tipo}`, aba: 'essencia', tipo: x.tipo, id: x.id, nome: x.nome, raridade: x.raridade, moeda: 'essenciaDeSoberano', preco: x.preco, limiteMensal: x.limite, daSemana: false });
  return produtos;
}

/** O mês das compras (AAAA-MM no horário de Brasília): o limite zera no dia 1. */
export const mesDeBrasilia = (agora: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(agora).slice(0, 7);

/** comprasNaLoja: quantas unidades de cada produto o jogador comprou no mês. */
export interface ComprasNaLoja {
  mes: string;
  itens: Record<string, number>;
}

/** Quanto o jogador já comprou de um produto neste mês. */
export const compradasNoMes = (c: ComprasNaLoja | undefined, chave: string, agora: Date) => (c && c.mes === mesDeBrasilia(agora) ? (c.itens[chave] ?? 0) : 0);

export function comprasNaLojaDoDocumento(bruto: unknown): ComprasNaLoja | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const { mes, itens } = bruto as Record<string, unknown>;
  if (typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes) || !itens || typeof itens !== 'object' || Array.isArray(itens)) return undefined;
  const limpos: Record<string, number> = {};
  for (const [k, v] of Object.entries(itens as Record<string, unknown>).slice(0, 200)) if (typeof v === 'number' && Number.isInteger(v) && v > 0 && k.length <= 80) limpos[k] = v;
  return { mes, itens: limpos };
}
