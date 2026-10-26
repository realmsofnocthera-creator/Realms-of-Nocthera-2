/**
 * Sanções contra jogadores (3.5.4.3): advertir, suspender com prazo, banir e desbanir.
 * Só a suspensão e o banimento bloqueiam a conta; a advertência fica registrada no histórico do jogador.
 */
export const ACOES_DE_SANCAO = ['advertir', 'suspender', 'banir', 'desbanir', 'limitar', 'tirarLimite'] as const;
export type AcaoDeSancao = (typeof ACOES_DE_SANCAO)[number];

export const NOME_DA_ACAO: Readonly<Record<AcaoDeSancao, string>> = {
  advertir: 'Advertir',
  suspender: 'Suspender',
  banir: 'Banir',
  desbanir: 'Levantar suspensão ou banimento',
  limitar: 'Limite silencioso (tirar dos rankings)',
  tirarLimite: 'Tirar o limite silencioso',
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

/**
 * Limite silencioso (6.5-7, decisão do Yuri em 24/10/2026): a conta joga normalmente, mas sai dos rankings e só
 * recebe a recompensa mínima do Chefe Mundial e do Chefe de guildas. O jogador não é avisado.
 */
export interface LimiteSilencioso {
  motivo: string;
  aplicadoPor: string;
  aplicadoEm: string;
}

/** Silêncio no chat (7.7): o jogador joga normalmente, mas não consegue enviar mensagens até `ate`. */
export interface SilencioNoChat {
  ate: string;
  motivo: string;
  aplicadoPor: string;
  aplicadoEm: string;
}

export type SituacaoDaApelacao = 'pendente' | 'aceita' | 'recusada';

/** Pedido de apelação feito pelo jogo (6.5-7): um por sanção. */
export interface Apelacao {
  texto: string;
  em: string;
  /** A sanção a que o pedido se refere (o aplicadaEm dela). */
  daSancaoDe: string;
  situacao: SituacaoDaApelacao;
  resposta?: string;
  respondidaPor?: string;
  respondidaEm?: string;
}

export const APELACAO_MINIMA = 20;
export const APELACAO_MAXIMA = 1000;
export const RESPOSTA_MAXIMA = 500;

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
  limiteSilencioso?: LimiteSilencioso | null;
  silencioNoChat?: SilencioNoChat | null;
  apelacao?: Apelacao | null;
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

/** O jogador ainda pode pedir apelação da sanção em vigor (um pedido por sanção). */
export function podeApelar(doc: SancaoDocumento | null, agora: Date): boolean {
  if (!doc || !sancaoEmVigor(doc, agora)) return false;
  return !doc.apelacao || doc.apelacao.daSancaoDe !== doc.aplicadaEm;
}

export function apelacaoDoDocumento(bruto: unknown): Apelacao | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.texto !== 'string' || typeof o.em !== 'string' || typeof o.daSancaoDe !== 'string') return null;
  const situacao: SituacaoDaApelacao = o.situacao === 'aceita' || o.situacao === 'recusada' ? o.situacao : 'pendente';
  return {
    texto: o.texto,
    em: o.em,
    daSancaoDe: o.daSancaoDe,
    situacao,
    ...(typeof o.resposta === 'string' ? { resposta: o.resposta } : {}),
    ...(typeof o.respondidaPor === 'string' ? { respondidaPor: o.respondidaPor } : {}),
    ...(typeof o.respondidaEm === 'string' ? { respondidaEm: o.respondidaEm } : {}),
  };
}

export function limiteDoDocumento(bruto: unknown): LimiteSilencioso | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.aplicadoEm !== 'string') return null;
  return { motivo: typeof o.motivo === 'string' ? o.motivo : '', aplicadoPor: typeof o.aplicadoPor === 'string' ? o.aplicadoPor : '', aplicadoEm: o.aplicadoEm };
}

export function silencioDoDocumento(bruto: unknown): SilencioNoChat | null {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.ate !== 'string' || !Number.isFinite(Date.parse(o.ate))) return null;
  return { ate: o.ate, motivo: typeof o.motivo === 'string' ? o.motivo : '', aplicadoPor: typeof o.aplicadoPor === 'string' ? o.aplicadoPor : '', aplicadoEm: typeof o.aplicadoEm === 'string' ? o.aplicadoEm : '' };
}

/** O silêncio que ainda vale em `agora` (o vencido deixa de valer sozinho). */
export function silencioEmVigor(doc: SancaoDocumento | null, agora: Date): SilencioNoChat | null {
  const s = doc?.silencioNoChat;
  return s && Date.parse(s.ate) > agora.getTime() ? s : null;
}
