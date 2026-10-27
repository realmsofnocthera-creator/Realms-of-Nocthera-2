import type { SelosDoJogador } from './colecionaveis';
import type { PresenteDoCorreio } from './correio';
import type { BeneficioDoVip } from './vip';

/**
 * Passes (8.5, decididos pelo Yuri em 27/10/2026). Cada Passe dura 30 dias a partir do dia da compra (o dia da compra já
 * vale e o Passe acaba na meia-noite de Brasília do 30º dia). Comprar de novo antes do fim soma mais 30 dias. Os itens
 * diários chegam pelo Correio, uma mensagem por entrega; os dias que o jogador não abriu o jogo ficam guardados e chegam
 * juntos, até o fim do Passe. Os bônus de XP, ouro e desconto do Premium e do Deluxe não somam entre si (vale o maior), mas
 * somam com o VIP; as Moedas VIP e os Avanços de expedição dos dois somam. Os dias são strings AAAA-MM-DD de Brasília.
 */

export const DIAS_DO_PASSE = 30;

export const PASSES = ['premium', 'deluxe', 'invocador', 'diamantes'] as const;
export type PasseId = (typeof PASSES)[number];

export interface DefinicaoDoPasse {
  id: PasseId;
  /** O id do produto no catálogo de compras. */
  produto: string;
  nome: string;
  precoCentavos: number;
  /** Bônus em % de XP e de ouro nos combates e desconto em % na Loja e na Forja. */
  xp: number;
  ouro: number;
  desconto: number;
  /** O que chega por dia pelo Correio. */
  porDia: PresenteDoCorreio;
  beneficios: readonly BeneficioDoVip[];
}

const ativo = (texto: string): BeneficioDoVip => ({ texto, estado: 'ativo' });
const emBreve = (texto: string): BeneficioDoVip => ({ texto, estado: 'emBreve' });

export const DEFINICOES_DOS_PASSES: readonly DefinicaoDoPasse[] = [
  {
    id: 'premium',
    produto: 'passe-premium',
    nome: 'Passe Premium',
    precoCentavos: 1_999,
    xp: 10,
    ouro: 15,
    desconto: 5,
    porDia: { avancosDeExpedicao: 4, moedasVip: 10 },
    beneficios: [ativo('+10% de XP e +15% de ouro nos combates.'), ativo('-5% na Loja e na Forja.'), ativo('Por dia: 4 Avanços de expedição e 10 Moedas VIP.'), emBreve('Moldura exclusiva.')],
  },
  {
    id: 'deluxe',
    produto: 'passe-deluxe',
    nome: 'Passe Deluxe',
    precoCentavos: 4_999,
    xp: 20,
    ouro: 25,
    desconto: 10,
    // o "Pergaminho épico" do Yuri não existe como selo: entra como 10 Selos Encantados (confirmado em 27/10/2026)
    porDia: { avancosDeExpedicao: 8, moedasVip: 20, selos: { encantado: 10 } },
    beneficios: [ativo('+20% de XP e +25% de ouro nos combates.'), ativo('-10% na Loja e na Forja.'), ativo('Por dia: 8 Avanços de expedição, 20 Moedas VIP e 10 Selos Encantados.')],
  },
  {
    id: 'invocador',
    produto: 'passe-invocador',
    nome: 'Passe do Invocador',
    precoCentavos: 2_999,
    xp: 0,
    ouro: 0,
    desconto: 0,
    porDia: { selos: { desgastado: 20, encantado: 20, eternidade: 10, origem: 5 } },
    beneficios: [ativo('Por dia: 20 Selos Desgastados, 20 Encantados, 10 da Eternidade e 5 da Origem.')],
  },
  {
    id: 'diamantes',
    produto: 'passe-diamantes',
    nome: 'Passe de Diamantes',
    precoCentavos: 1_999,
    xp: 0,
    ouro: 0,
    desconto: 0,
    porDia: { diamantes: 20 },
    beneficios: [ativo('Por dia: 20 Diamantes (600 em 30 dias).')],
  },
];

export const definicaoDoPasse = (id: unknown) => DEFINICOES_DOS_PASSES.find((p) => p.id === id);
export const passeDoProduto = (produto: unknown) => DEFINICOES_DOS_PASSES.find((p) => p.produto === produto);

// ---------------------------------------------------------------------------------------------------------------
// Dias
// ---------------------------------------------------------------------------------------------------------------

const MS_DO_DIA = 86_400_000;
const noMeioDoDia = (dia: string) => Date.parse(`${dia}T12:00:00.000Z`);
export const somarDias = (dia: string, n: number) => new Date(noMeioDoDia(dia) + n * MS_DO_DIA).toISOString().slice(0, 10);
/** Quantos dias de `a` até `b` (positivo se `b` vem depois). */
export const diasEntre = (a: string, b: string) => Math.round((noMeioDoDia(b) - noMeioDoDia(a)) / MS_DO_DIA);
const ehDia = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(noMeioDoDia(v));

// ---------------------------------------------------------------------------------------------------------------
// O Passe do jogador
// ---------------------------------------------------------------------------------------------------------------

export interface PasseDoJogador {
  /** O primeiro e o último dia (inclusive) do Passe. */
  inicio: string;
  fim: string;
  /** O último dia já entregue pelo Correio. */
  entregueAte?: string;
}

export type PassesDoJogador = Partial<Record<PasseId, PasseDoJogador>>;

export const passeAtivo = (p: PasseDoJogador | undefined, hoje: string): p is PasseDoJogador => !!p && hoje >= p.inicio && hoje <= p.fim;
export const diasRestantesDoPasse = (p: PasseDoJogador | undefined, hoje: string) => (passeAtivo(p, hoje) ? diasEntre(hoje, p.fim) + 1 : 0);

/** A janela de 30 dias que uma compra feita hoje acrescenta (depois do fim, se o Passe ainda vale). */
export function janelaDaCompra(p: PasseDoJogador | undefined, hoje: string): { desde: string; ate: string } {
  const desde = p && hoje <= p.fim ? somarDias(p.fim, 1) : hoje;
  return { desde, ate: somarDias(desde, DIAS_DO_PASSE - 1) };
}

/** O estado depois de comprar: soma 30 dias ao que resta, ou começa hoje se o Passe não vale mais. */
export function comPasseComprado(passes: PassesDoJogador | undefined, id: PasseId, hoje: string): PassesDoJogador {
  const atual = passes?.[id];
  const { ate } = janelaDaCompra(atual, hoje);
  const novo: PasseDoJogador = atual && hoje <= atual.fim ? { ...atual, fim: ate } : { inicio: hoje, fim: ate };
  return { ...(passes ?? {}), [id]: novo };
}

/** Quantos dias já valem e ainda não foram entregues (do último entregue até hoje, sem passar do fim). */
export function diasPendentes(p: PasseDoJogador | undefined, hoje: string): number {
  if (!p || hoje < p.inicio) return 0;
  const de = p.entregueAte ? somarDias(p.entregueAte, 1) : p.inicio;
  const ate = hoje < p.fim ? hoje : p.fim;
  return Math.max(0, diasEntre(de, ate) + 1);
}

/** Multiplica o presente diário pelos dias (ouro, Diamantes, Moedas VIP, Avanços e selos). */
export function presenteDosDias(def: DefinicaoDoPasse, dias: number): PresenteDoCorreio {
  const p = def.porDia;
  const selos: SelosDoJogador = {};
  for (const [s, n] of Object.entries(p.selos ?? {})) selos[s as keyof SelosDoJogador] = (n as number) * dias;
  return {
    ...(p.ouro ? { ouro: p.ouro * dias } : {}),
    ...(p.diamantes ? { diamantes: p.diamantes * dias } : {}),
    ...(p.moedasVip ? { moedasVip: p.moedasVip * dias } : {}),
    ...(p.avancosDeExpedicao ? { avancosDeExpedicao: p.avancosDeExpedicao * dias } : {}),
    ...(Object.keys(selos).length ? { selos } : {}),
  };
}

export interface EntregaDoDia {
  passe: DefinicaoDoPasse;
  dias: number;
  presente: PresenteDoCorreio;
}

/** O que ainda falta entregar hoje, de cada Passe, e o estado com a entrega marcada. */
export function entregasDeHoje(passes: PassesDoJogador | undefined, hoje: string): { entregas: EntregaDoDia[]; passes: PassesDoJogador | undefined } {
  const entregas: EntregaDoDia[] = [];
  const novo: PassesDoJogador = { ...(passes ?? {}) };
  for (const def of DEFINICOES_DOS_PASSES) {
    const p = novo[def.id];
    const dias = diasPendentes(p, hoje);
    if (!p || !dias) continue;
    entregas.push({ passe: def, dias, presente: presenteDosDias(def, dias) });
    novo[def.id] = { ...p, entregueAte: hoje < p.fim ? hoje : p.fim };
  }
  return { entregas, passes: entregas.length ? novo : passes };
}

/** O bônus em vigor: o maior entre os Passes ativos (Premium e Deluxe não somam). */
export function bonusDosPasses(passes: PassesDoJogador | undefined, hoje: string): { xp: number; ouro: number; desconto: number } {
  let xp = 0;
  let ouro = 0;
  let desconto = 0;
  for (const def of DEFINICOES_DOS_PASSES) {
    if (!passeAtivo(passes?.[def.id], hoje)) continue;
    xp = Math.max(xp, def.xp);
    ouro = Math.max(ouro, def.ouro);
    desconto = Math.max(desconto, def.desconto);
  }
  return { xp, ouro, desconto };
}

/** O preço com o desconto dos Passes (arredonda para baixo e nunca zera um preço que não era zero). */
export const comDescontoDoPasse = (preco: number, desconto: number) => (preco > 0 && desconto > 0 ? Math.max(1, Math.floor((preco * (100 - desconto)) / 100)) : preco);

export function passesDoDocumento(bruto: unknown): PassesDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: PassesDoJogador = {};
  for (const id of PASSES) {
    const o = (bruto as Record<string, unknown>)[id] as Record<string, unknown> | undefined;
    if (!o || typeof o !== 'object' || !ehDia(o.inicio) || !ehDia(o.fim) || o.fim < o.inicio) continue;
    saida[id] = { inicio: o.inicio, fim: o.fim, ...(ehDia(o.entregueAte) ? { entregueAte: o.entregueAte } : {}) };
  }
  return Object.keys(saida).length ? saida : undefined;
}
