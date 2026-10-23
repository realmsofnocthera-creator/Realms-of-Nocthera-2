import type { PresenteDoCorreio } from './correio';

/**
 * Missões diárias e semanais e o Check-in (decididos pelo Yuri em 23/10/2026; lista, calendário e quantidades de
 * Diamantes são proposta aprovada por ele, com o total de Diamantes ajustado para cerca de 600 por mês).
 *
 * Diárias: 7 por dia (reiniciam à meia-noite de Brasília) e um baú de progresso que abre com 2, 5 e 7 missões.
 * Semanais: 10 por semana (reiniciam na segunda-feira), baú com 2, 5, 7 e 10 missões. Check-in: calendário de 30 dias.
 */

/** O que as missões contam. `diarias` só existe na semana (quantas diárias foram concluídas). */
export type MetricaDeMissao = 'checkin' | 'vitorias' | 'chefes' | 'torre' | 'forja' | 'expedicoes' | 'buscas' | 'chefeMundial' | 'diarias';
export const METRICAS_DE_MISSAO: readonly MetricaDeMissao[] = ['checkin', 'vitorias', 'chefes', 'torre', 'forja', 'expedicoes', 'buscas', 'chefeMundial', 'diarias'];
export type ProgressoDeMissoes = Partial<Record<MetricaDeMissao, number>>;

export interface DefinicaoDeMissao {
  id: string;
  nome: string;
  metrica: MetricaDeMissao;
  meta: number;
}

export const MISSOES_DIARIAS: readonly DefinicaoDeMissao[] = [
  { id: 'd-checkin', nome: 'Fazer o Check-in do dia', metrica: 'checkin', meta: 1 },
  { id: 'd-vitorias-5', nome: 'Vencer 5 lutas', metrica: 'vitorias', meta: 5 },
  { id: 'd-vitorias-15', nome: 'Vencer 15 lutas', metrica: 'vitorias', meta: 15 },
  { id: 'd-vitorias-30', nome: 'Vencer 30 lutas', metrica: 'vitorias', meta: 30 },
  { id: 'd-chefe', nome: 'Vencer 1 chefe', metrica: 'chefes', meta: 1 },
  { id: 'd-torre', nome: 'Subir 1 andar da Torre Celestial', metrica: 'torre', meta: 1 },
  { id: 'd-forja', nome: 'Fabricar ou reforjar 1 item', metrica: 'forja', meta: 1 },
];

export const MISSOES_SEMANAIS: readonly DefinicaoDeMissao[] = [
  { id: 's-checkin', nome: 'Fazer o Check-in em 5 dias', metrica: 'checkin', meta: 5 },
  { id: 's-diarias', nome: 'Completar 20 missões diárias', metrica: 'diarias', meta: 20 },
  { id: 's-vitorias-100', nome: 'Vencer 100 lutas', metrica: 'vitorias', meta: 100 },
  { id: 's-vitorias-250', nome: 'Vencer 250 lutas', metrica: 'vitorias', meta: 250 },
  { id: 's-chefes', nome: 'Vencer 10 chefes', metrica: 'chefes', meta: 10 },
  { id: 's-torre', nome: 'Subir 10 andares da Torre Celestial', metrica: 'torre', meta: 10 },
  { id: 's-forja', nome: 'Fabricar ou reforjar 5 itens', metrica: 'forja', meta: 5 },
  { id: 's-expedicoes', nome: 'Coletar 5 expedições', metrica: 'expedicoes', meta: 5 },
  { id: 's-buscas', nome: 'Fazer 30 buscas', metrica: 'buscas', meta: 30 },
  { id: 's-chefe-mundial', nome: 'Lutar no Chefe Mundial em 3 dias', metrica: 'chefeMundial', meta: 3 },
];

/** Um degrau do baú de progresso: abre com `missoes` concluídas e dá `diamantes`. */
export interface DegrauDoBau {
  missoes: number;
  diamantes: number;
}
export const BAU_DIARIO: readonly DegrauDoBau[] = [
  { missoes: 2, diamantes: 2 },
  { missoes: 5, diamantes: 4 },
  { missoes: 7, diamantes: 6 },
];
export const BAU_SEMANAL: readonly DegrauDoBau[] = [
  { missoes: 2, diamantes: 5 },
  { missoes: 5, diamantes: 10 },
  { missoes: 7, diamantes: 15 },
  { missoes: 10, diamantes: 20 },
];

/** O que fica no personagem: os contadores do dia e da semana e quantos degraus de baú já foram resgatados. */
export interface DiarioDoJogador {
  /** O dia (Brasília) a que `hoje` e `bausDiarios` se referem. */
  dia: string;
  /** A semana (a segunda-feira em que começa) a que `estaSemana` e `bausSemanais` se referem. */
  semana: string;
  hoje: ProgressoDeMissoes;
  estaSemana: ProgressoDeMissoes;
  bausDiarios: number;
  bausSemanais: number;
}

export const diarioVazio = (dia: string, semana: string): DiarioDoJogador => ({ dia, semana, hoje: {}, estaSemana: {}, bausDiarios: 0, bausSemanais: 0 });

/** Traz as missões para o dia e a semana de agora: o que é de outro dia ou outra semana zera. */
export function diarioDeAgora(m: DiarioDoJogador | undefined, dia: string, semana: string): DiarioDoJogador {
  if (!m) return diarioVazio(dia, semana);
  const mesmaSemana = m.semana === semana;
  const mesmoDia = m.dia === dia;
  return {
    dia,
    semana,
    hoje: mesmoDia ? m.hoje : {},
    bausDiarios: mesmoDia ? m.bausDiarios : 0,
    estaSemana: mesmaSemana ? m.estaSemana : {},
    bausSemanais: mesmaSemana ? m.bausSemanais : 0,
  };
}

export const missaoCompleta = (d: DefinicaoDeMissao, p: ProgressoDeMissoes) => (p[d.metrica] ?? 0) >= d.meta;
export const quantasCompletas = (lista: readonly DefinicaoDeMissao[], p: ProgressoDeMissoes) => lista.filter((d) => missaoCompleta(d, p)).length;

/**
 * Soma o que o jogador fez às missões do dia e da semana. As diárias que acabaram de ser concluídas contam na missão
 * semanal "Completar 20 missões diárias".
 */
export function somarDiario(m: DiarioDoJogador | undefined, ganhos: ProgressoDeMissoes, dia: string, semana: string): DiarioDoJogador {
  const base = diarioDeAgora(m, dia, semana);
  const antes = quantasCompletas(MISSOES_DIARIAS, base.hoje);
  const hoje: ProgressoDeMissoes = { ...base.hoje };
  const estaSemana: ProgressoDeMissoes = { ...base.estaSemana };
  for (const metrica of METRICAS_DE_MISSAO) {
    const n = Math.floor(ganhos[metrica] ?? 0);
    if (n <= 0 || metrica === 'diarias') continue;
    hoje[metrica] = (hoje[metrica] ?? 0) + n;
    estaSemana[metrica] = (estaSemana[metrica] ?? 0) + n;
  }
  const novas = quantasCompletas(MISSOES_DIARIAS, hoje) - antes;
  if (novas > 0) estaSemana.diarias = (estaSemana.diarias ?? 0) + novas;
  return { ...base, hoje, estaSemana };
}

/** Quantos degraus do baú estão abertos e ainda não foram resgatados. */
export function baus(degraus: readonly DegrauDoBau[], completas: number, resgatados: number): { prontos: DegrauDoBau[]; abertos: number } {
  const abertos = degraus.filter((d) => completas >= d.missoes).length;
  return { prontos: degraus.slice(Math.min(resgatados, abertos), abertos), abertos };
}

// ---------------------------------------------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------------------------------------------

export const DIAS_DO_CHECKIN = 30;

/** O que fica no personagem: o último dia do check-in e quantos dias do ciclo de 30 já foram feitos. */
export interface CheckinDoJogador {
  ultimoDia: string;
  /** Dias já feitos no ciclo atual (0 a 29); o próximo é feitos + 1. Depois do 30º, volta a 0. */
  feitos: number;
}

const CICLO_DOS_COMUNS: readonly PresenteDoCorreio[] = [
  { ouro: 1000 },
  { selos: { desgastado: 5 } },
  { avancosDeExpedicao: 1 },
  { fragmentosDeMemoria: 20 },
  { ouro: 2000 },
  { selos: { encantado: 2 } },
];

/** Os dias especiais do calendário e o que dão. */
export const DIAS_ESPECIAIS_DO_CHECKIN: Readonly<Record<number, PresenteDoCorreio>> = {
  7: { diamantes: 5, selos: { eternidade: 1 } },
  14: { diamantes: 10, selos: { eternidade: 2 } },
  21: { diamantes: 10, pedrasDaRecordacao: 1 },
  30: { diamantes: 25, selos: { origem: 1 } },
};

/** A recompensa do dia n (1 a 30) do calendário. */
export function recompensaDoCheckin(dia: number): PresenteDoCorreio {
  const n = Math.min(DIAS_DO_CHECKIN, Math.max(1, Math.floor(dia)));
  const especial = DIAS_ESPECIAIS_DO_CHECKIN[n];
  if (especial) return especial;
  const antes = Object.keys(DIAS_ESPECIAIS_DO_CHECKIN).filter((d) => Number(d) < n).length;
  return CICLO_DOS_COMUNS[(n - 1 - antes) % CICLO_DOS_COMUNS.length];
}

/** O check-in de hoje já foi feito? */
export const checkinFeitoHoje = (c: CheckinDoJogador | undefined, dia: string) => c?.ultimoDia === dia;

/** O dia do calendário que o jogador faz agora (1 a 30). */
export const proximoDiaDoCheckin = (c: CheckinDoJogador | undefined) => ((c?.feitos ?? 0) % DIAS_DO_CHECKIN) + 1;

// ---------------------------------------------------------------------------------------------------------------
// Leitura tolerante do banco
// ---------------------------------------------------------------------------------------------------------------

const DIA_VALIDO = /^\d{4}-\d{2}-\d{2}$/;
const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

function progressoDoDocumento(bruto: unknown): ProgressoDeMissoes {
  const saida: ProgressoDeMissoes = {};
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return saida;
  for (const m of METRICAS_DE_MISSAO) {
    const n = inteiroPositivo((bruto as Record<string, unknown>)[m]);
    if (n) saida[m] = n;
  }
  return saida;
}

export function diarioDoDocumento(bruto: unknown): DiarioDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const o = bruto as Record<string, unknown>;
  if (typeof o.dia !== 'string' || !DIA_VALIDO.test(o.dia) || typeof o.semana !== 'string' || !DIA_VALIDO.test(o.semana)) return undefined;
  return {
    dia: o.dia,
    semana: o.semana,
    hoje: progressoDoDocumento(o.hoje),
    estaSemana: progressoDoDocumento(o.estaSemana),
    bausDiarios: Math.min(BAU_DIARIO.length, inteiroPositivo(o.bausDiarios)),
    bausSemanais: Math.min(BAU_SEMANAL.length, inteiroPositivo(o.bausSemanais)),
  };
}

export function checkinDoDocumento(bruto: unknown): CheckinDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const o = bruto as Record<string, unknown>;
  if (typeof o.ultimoDia !== 'string' || !DIA_VALIDO.test(o.ultimoDia)) return undefined;
  return { ultimoDia: o.ultimoDia, feitos: Math.min(DIAS_DO_CHECKIN - 1, inteiroPositivo(o.feitos)) };
}
