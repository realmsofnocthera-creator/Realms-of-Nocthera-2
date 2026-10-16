/**
 * Sanções contra jogadores (3.5.4.3): advertir, suspender com prazo, banir e desbanir.
 * Só a suspensão e o banimento bloqueiam a conta; a advertência fica registrada no histórico do jogador.
 */
export const ACOES_DE_SANCAO = ['advertir', 'suspender', 'banir', 'desbanir'] as const;
export type AcaoDeSancao = (typeof ACOES_DE_SANCAO)[number];

export const NOME_DA_ACAO: Readonly<Record<AcaoDeSancao, string>> = {
  advertir: 'Advertir',
  suspender: 'Suspender',
  banir: 'Banir',
  desbanir: 'Levantar suspensão ou banimento',
};

export const DIAS_MINIMOS_DE_SUSPENSAO = 1;
export const DIAS_MAXIMOS_DE_SUSPENSAO = 365;
/** Quantas advertências ficam guardadas por jogador (as mais recentes). */
export const MAXIMO_DE_ADVERTENCIAS = 20;

export type TipoDeSancao = 'suspensao' | 'banimento';

export interface Advertencia {
  em: string;
  por: string;
  motivo: string;
}

/** sancoes/{uid}: o estado atual da conta e o histórico de advertências. */
export interface SancaoDocumento {
  uid: string;
  /** Sanção em vigor, ou null se a conta está livre. */
  tipo: TipoDeSancao | null;
  /** Fim da suspensão (ISO); null no banimento e quando não há sanção. */
  ate: string | null;
  motivo: string;
  aplicadaPor: string;
  aplicadaEm: string;
  advertencias: Advertencia[];
}

export interface SancaoEmVigor {
  tipo: TipoDeSancao;
  ate: string | null;
  motivo: string;
}

export function ehAcaoDeSancao(valor: unknown): valor is AcaoDeSancao {
  return typeof valor === 'string' && (ACOES_DE_SANCAO as readonly string[]).includes(valor);
}

export function sancaoDocumentoVazio(uid: string): SancaoDocumento {
  return { uid, tipo: null, ate: null, motivo: '', aplicadaPor: '', aplicadaEm: '', advertencias: [] };
}

/** A sanção que ainda vale em `agora`: a suspensão vencida deixa de valer sozinha, sem ninguém desfazer. */
export function sancaoEmVigor(doc: SancaoDocumento | null, agora: Date): SancaoEmVigor | null {
  if (!doc || doc.tipo === null) return null;
  if (doc.tipo === 'suspensao') {
    const fim = doc.ate ? Date.parse(doc.ate) : NaN;
    if (!Number.isFinite(fim) || fim <= agora.getTime()) return null;
  }
  return { tipo: doc.tipo, ate: doc.tipo === 'suspensao' ? doc.ate : null, motivo: doc.motivo };
}

function dataEmBrasilia(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}

/** O que o jogador lê quando tenta entrar com a conta sancionada. */
export function mensagemDaSancao(s: SancaoEmVigor): string {
  const motivo = s.motivo ? ` Motivo: ${s.motivo}` : '';
  if (s.tipo === 'banimento') return `Sua conta foi banida.${motivo}`;
  return `Sua conta está suspensa até ${s.ate ? dataEmBrasilia(s.ate) : 'nova ordem'} (horário de Brasília).${motivo}`;
}
