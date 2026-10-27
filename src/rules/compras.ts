/**
 * Compras com dinheiro real (8.5, decididas pelo Yuri em 27/10/2026). Esta fase tem o núcleo: o catálogo, o pedido com
 * estados (criado, pago, estornado, cancelado), a entrega e o estorno. O provedor de pagamento é um só, o de teste;
 * ligar um provedor real depois é trocar essa peça. Os valores em reais são guardados em centavos (inteiros).
 *
 * Os pacotes de Diamantes abaixo são a tabela PROPOSTA pelo Claude (valor por real sempre crescendo); a tabela só vale
 * depois que o Yuri confirmar, e a Loja VIP nasce desligada no Painel do Mestre.
 */

import { SELOS_DE_BUSCA, type SelosDoJogador } from './colecionaveis';
import { mesDeBrasilia } from './loja';
import { PASSES, type PasseId } from './passes';

export type EstadoDoPedido = 'criado' | 'pago' | 'estornado' | 'cancelado';

export const PROVEDORES = ['teste'] as const;
export type ProvedorDePagamento = (typeof PROVEDORES)[number];

export interface PacoteDeDiamantes {
  id: string;
  nome: string;
  precoCentavos: number;
  base: number;
  bonus: number;
}

export const PACOTES_DE_DIAMANTES: readonly PacoteDeDiamantes[] = [
  { id: 'diamantes-1', nome: 'Pequeno', precoCentavos: 499, base: 100, bonus: 0 },
  { id: 'diamantes-2', nome: 'Básico', precoCentavos: 999, base: 200, bonus: 20 },
  { id: 'diamantes-3', nome: 'Médio', precoCentavos: 1_999, base: 400, bonus: 80 },
  { id: 'diamantes-4', nome: 'Grande', precoCentavos: 3_499, base: 800, bonus: 100 },
  { id: 'diamantes-5', nome: 'Premium', precoCentavos: 5_999, base: 1_500, bonus: 200 },
  { id: 'diamantes-6', nome: 'Supremo', precoCentavos: 9_999, base: 2_500, bonus: 500 },
];

/** Pacote do Iniciante (Yuri, 27/10/2026): 1 por conta, R$ 9,99; o emblema épico é um baú de escolha. */
export const PACOTE_DO_INICIANTE = { id: 'iniciante', nome: 'Pacote do Iniciante', precoCentavos: 999, ouro: 4_000, diamantes: 200 } as const;
export const ehPacoteDoIniciante = (id: unknown) => id === PACOTE_DO_INICIANTE.id;

export const pacoteDeDiamantes = (id: unknown) => PACOTES_DE_DIAMANTES.find((p) => p.id === id);

/** A primeira compra de Diamantes da conta vale o dobro (base e bônus). */
export const MULTIPLICADOR_DA_PRIMEIRA_COMPRA = 2;

export const diamantesDoPacote = (p: PacoteDeDiamantes, primeiraCompra: boolean) => (p.base + p.bonus) * (primeiraCompra ? MULTIPLICADOR_DA_PRIMEIRA_COMPRA : 1);

/** Pedidos guardados no personagem (os mais antigos saem primeiro; o gasto acumulado fica à parte). */
export const PEDIDOS_GUARDADOS = 100;
/** Pedidos "criado" ao mesmo tempo (os mais antigos viram "cancelado"). */
export const PEDIDOS_ABERTOS_MAXIMOS = 5;

export interface PedidoDeCompra {
  id: string;
  /** O id do produto do catálogo. */
  produto: string;
  nome: string;
  valorCentavos: number;
  estado: EstadoDoPedido;
  provedor: ProvedorDePagamento;
  criadoEm: string;
  /** Código do pagamento no provedor (o recibo). */
  referencia?: string;
  pagoEm?: string;
  estornadoEm?: string;
  /** O que o pedido entregou, para o estorno desfazer. */
  diamantes?: number;
  entrega?: EntregaDoPacote;
  /** Passe comprado: qual e os 30 dias que esta compra acrescentou (para o estorno desfazer). */
  passe?: { id: PasseId; desde: string; ate: string };
}

const ESTADOS: readonly EstadoDoPedido[] = ['criado', 'pago', 'estornado', 'cancelado'];
const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);
const texto = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : undefined);

/** Lê os pedidos gravados, descartando o que está quebrado. */
export function pedidosDoDocumento(bruto: unknown): PedidoDeCompra[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const vistos = new Set<string>();
  const lista: PedidoDeCompra[] = [];
  for (const item of bruto) {
    const o = item as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') continue;
    const id = texto(o.id, 64);
    const produto = texto(o.produto, 64);
    const nome = texto(o.nome, 80);
    const criadoEm = texto(o.criadoEm, 40);
    const valorCentavos = inteiroPositivo(o.valorCentavos);
    if (!id || vistos.has(id) || !produto || !nome || !criadoEm || !valorCentavos) continue;
    if (!ESTADOS.includes(o.estado as EstadoDoPedido) || !PROVEDORES.includes(o.provedor as ProvedorDePagamento)) continue;
    vistos.add(id);
    const diamantes = inteiroPositivo(o.diamantes);
    const entrega = entregaDoDocumento(o.entrega);
    const passe = passeDoPedido(o.passe);
    lista.push({
      id,
      produto,
      nome,
      valorCentavos,
      estado: o.estado as EstadoDoPedido,
      provedor: o.provedor as ProvedorDePagamento,
      criadoEm,
      ...(texto(o.referencia, 128) ? { referencia: texto(o.referencia, 128) } : {}),
      ...(texto(o.pagoEm, 40) ? { pagoEm: texto(o.pagoEm, 40) } : {}),
      ...(texto(o.estornadoEm, 40) ? { estornadoEm: texto(o.estornadoEm, 40) } : {}),
      ...(diamantes ? { diamantes } : {}),
      ...(entrega ? { entrega } : {}),
      ...(passe ? { passe } : {}),
    });
  }
  return lista.length ? lista.slice(-PEDIDOS_GUARDADOS) : undefined;
}


// ---------------------------------------------------------------------------------------------------------------
// Pacotes mensais (Coleção, Ouro e Expedição)
// ---------------------------------------------------------------------------------------------------------------

/** O que um pacote mensal entrega (os "Pergaminhos" do Yuri são os Selos de busca). */
export interface EntregaDoPacote {
  /** Id do baú de escolha entregue (Pacote do Iniciante). */
  bauId?: string;
  ouro?: number;
  diamantes?: number;
  moedasVip?: number;
  avancosDeExpedicao?: number;
  selos?: SelosDoJogador;
}

export const CADEIAS_MENSAIS = ['colecao', 'ouro', 'expedicao'] as const;
export type CadeiaMensal = (typeof CADEIAS_MENSAIS)[number];
export const NOME_DA_CADEIA: Readonly<Record<CadeiaMensal, string>> = { colecao: 'Coleção', ouro: 'Ouro', expedicao: 'Expedição' };

export interface PacoteMensal {
  id: string;
  cadeia: CadeiaMensal;
  /** 1 a 4: a posição na cadeia. */
  ordem: number;
  nome: string;
  precoCentavos: number;
  entrega: EntregaDoPacote;
}

const NUMERAIS = ['I', 'II', 'III', 'IV'];
const PRECOS_MENSAIS = [499, 2_999, 5_999, 9_999];
const pacotes = (cadeia: CadeiaMensal, entregas: EntregaDoPacote[]): PacoteMensal[] =>
  entregas.map((entrega, i) => ({ id: `${cadeia}-${i + 1}`, cadeia, ordem: i + 1, nome: `${NOME_DA_CADEIA[cadeia]} ${NUMERAIS[i]}`, precoCentavos: PRECOS_MENSAIS[i], entrega }));

/** Valores do Yuri (27/10/2026). Pergaminho comum = Selo Desgastado; muito raro = Encantado; lendário = da Eternidade; mítico = da Origem. */
export const PACOTES_MENSAIS: readonly PacoteMensal[] = [
  ...pacotes('colecao', [
    { selos: { desgastado: 50, encantado: 40 } },
    { selos: { encantado: 50, eternidade: 40 } },
    { selos: { eternidade: 50, origem: 40 } },
    { selos: { eternidade: 100, origem: 100 } },
  ]),
  ...pacotes('ouro', [{ ouro: 1_000 }, { ouro: 5_000 }, { ouro: 12_000 }, { ouro: 30_000 }]),
  ...pacotes('expedicao', [{ avancosDeExpedicao: 8 }, { avancosDeExpedicao: 24 }, { avancosDeExpedicao: 56 }, { avancosDeExpedicao: 128 }]),
];

export const pacoteMensal = (id: unknown) => PACOTES_MENSAIS.find((p) => p.id === id);
export const pacotesDaCadeia = (cadeia: CadeiaMensal) => PACOTES_MENSAIS.filter((p) => p.cadeia === cadeia);

/** Quantos pacotes de cada cadeia o jogador já comprou no mês (a cadeia reinicia no dia 1, em Brasília). */
export interface ComprasMensais {
  mes: string;
  feitas: Partial<Record<CadeiaMensal, number>>;
}

export const feitasNoMes = (c: ComprasMensais | undefined, cadeia: CadeiaMensal, agora: Date) =>
  c && c.mes === mesDeBrasilia(agora) ? Math.min(4, c.feitas[cadeia] ?? 0) : 0;

/** O próximo pacote da cadeia que o jogador pode comprar neste mês (null se já comprou os 4). */
export const proximoPacoteDaCadeia = (c: ComprasMensais | undefined, cadeia: CadeiaMensal, agora: Date) => pacotesDaCadeia(cadeia)[feitasNoMes(c, cadeia, agora)] ?? null;

/** Registra a compra de um pacote no mês (começa o mês novo do zero se o guardado for de outro mês). */
export function comCompraMensal(c: ComprasMensais | undefined, pacote: PacoteMensal, agora: Date): ComprasMensais {
  const mes = mesDeBrasilia(agora);
  const feitas = c && c.mes === mes ? { ...c.feitas } : {};
  feitas[pacote.cadeia] = Math.max(feitas[pacote.cadeia] ?? 0, pacote.ordem);
  return { mes, feitas };
}

export function comprasMensaisDoDocumento(bruto: unknown): ComprasMensais | undefined {
  const o = bruto as { mes?: unknown; feitas?: unknown } | null;
  if (!o || typeof o !== 'object' || typeof o.mes !== 'string' || !/^\d{4}-\d{2}$/.test(o.mes) || !o.feitas || typeof o.feitas !== 'object') return undefined;
  const feitas: Partial<Record<CadeiaMensal, number>> = {};
  for (const cadeia of CADEIAS_MENSAIS) {
    const n = (o.feitas as Record<string, unknown>)[cadeia];
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) feitas[cadeia] = Math.min(4, n);
  }
  return Object.keys(feitas).length ? { mes: o.mes, feitas } : undefined;
}

export function entregaDoDocumento(bruto: unknown): EntregaDoPacote | undefined {
  const o = bruto as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return undefined;
  const bauId = texto(o.bauId, 64);
  const ouro = inteiroPositivo(o.ouro);
  const diamantes = inteiroPositivo(o.diamantes);
  const moedasVip = inteiroPositivo(o.moedasVip);
  const avancosDeExpedicao = inteiroPositivo(o.avancosDeExpedicao);
  const selos: SelosDoJogador = {};
  const brutoSelos = o.selos as Record<string, unknown> | undefined;
  if (brutoSelos && typeof brutoSelos === 'object') for (const s of SELOS_DE_BUSCA) if (inteiroPositivo(brutoSelos[s])) selos[s] = inteiroPositivo(brutoSelos[s]);
  const saida: EntregaDoPacote = { ...(bauId ? { bauId } : {}), ...(ouro ? { ouro } : {}), ...(diamantes ? { diamantes } : {}), ...(moedasVip ? { moedasVip } : {}), ...(avancosDeExpedicao ? { avancosDeExpedicao } : {}), ...(Object.keys(selos).length ? { selos } : {}) };
  return Object.keys(saida).length ? saida : undefined;
}

function passeDoPedido(bruto: unknown): PedidoDeCompra['passe'] {
  const o = bruto as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || !(PASSES as readonly unknown[]).includes(o.id)) return undefined;
  const dia = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return dia(o.desde) && dia(o.ate) ? { id: o.id as PasseId, desde: o.desde, ate: o.ate } : undefined;
}
