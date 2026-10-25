import { SELOS_DE_BUSCA, NOME_DO_SELO, type SelosDoJogador } from './colecionaveis';
import { MATERIAIS_MUNDO_MAP } from './materiaisArmas';
import { MATERIAIS_MAP } from './materiais';
import { TITULO_MAP, titulosDoDocumento } from './titulos';
import { lerCartasPersonagem, TIPO_DE_CARTA_MAP, type CartaItem } from './almas';
import { ARMAS_BASE_MAP } from './armasCatalogo';
import { PECAS_ARMADURA_MAP } from './armadurasCatalogo';
import { TIPO_EMBLEMA_MAP } from './emblemasCatalogo';
import { lerArmasPersonagem, type ArmaPersonagem } from '@/game/forja';
import { lerArmadurasPersonagem, type ArmaduraPersonagem } from '@/game/armaduraForja';
import { lerEmblemasPersonagem, type EmblemaItem } from '@/game/emblemas';

/**
 * Correio (decidido pelo Yuri em 22/10/2026): mensagens com presentes para o jogador resgatar. Cada mensagem fica 30
 * dias; depois some, resgatada ou não. Chegam as recompensas do Chefe Mundial e as mensagens do Mestre (para um jogador
 * ou para todos). As mensagens para um jogador ficam no personagem; as para todos ficam numa coleção à parte
 * (correioGeral) e o personagem guarda só quais já resgatou ou apagou.
 */

export const VALIDADE_DO_CORREIO_MS = 30 * 24 * 60 * 60_000;
/** Mensagens guardadas no personagem (as mais antigas saem primeiro). */
export const MENSAGENS_MAXIMAS = 100;
export const TITULO_MAXIMO = 60;
export const TEXTO_MAXIMO = 500;

/** O que uma mensagem pode trazer. */
export interface PresenteDoCorreio {
  ouro?: number;
  diamantes?: number;
  essenciaDeSoberano?: number;
  selos?: SelosDoJogador;
  fragmentosDeMemoria?: number;
  pedrasDaRecordacao?: number;
  avancosDeExpedicao?: number;
  /** Materiais (de monstro ou de mundo): id → quantidade. */
  materiais?: Record<string, number>;
  /** Títulos do perfil (ranking e eventos). */
  titulos?: string[];
  /** Itens do Mercado e do Leilão (7.2): chegam pelo Correio quando ganhos no leilão ou quando não cabiam na mochila. */
  cartas?: CartaItem[];
  emblemas?: EmblemaItem[];
  armas?: ArmaPersonagem[];
  armaduras?: ArmaduraPersonagem[];
}

export interface MensagemDoCorreio {
  id: string;
  titulo: string;
  texto: string;
  /** Quem mandou: "Chefe Mundial", "Mestre"… */
  de: string;
  criadaEm: string;
  expiraEm: string;
  presente?: PresenteDoCorreio;
  resgatada?: boolean;
}

/** Uma mensagem para todos (coleção correioGeral). */
export type MensagemGeral = Omit<MensagemDoCorreio, 'resgatada'>;

/** O que o personagem fez com cada mensagem para todos: resgatou ou apagou. */
export type CorreioGeralDoJogador = Record<string, 'resgatada' | 'apagada'>;

const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);

export const presenteVazio = (p: PresenteDoCorreio | undefined) =>
  !p ||
  (!p.ouro &&
    !p.diamantes &&
    !p.essenciaDeSoberano &&
    !p.fragmentosDeMemoria &&
    !p.pedrasDaRecordacao &&
    !p.avancosDeExpedicao &&
    !Object.keys(p.selos ?? {}).length &&
    !Object.keys(p.materiais ?? {}).length &&
    !p.titulos?.length &&
    !p.cartas?.length &&
    !p.emblemas?.length &&
    !p.armas?.length &&
    !p.armaduras?.length);

/** Lê um presente, descartando valores inválidos e materiais que não existem. */
export function presenteDoDocumento(bruto: unknown): PresenteDoCorreio | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const o = bruto as Record<string, unknown>;
  const p: PresenteDoCorreio = {};
  for (const campo of ['ouro', 'diamantes', 'essenciaDeSoberano', 'fragmentosDeMemoria', 'pedrasDaRecordacao', 'avancosDeExpedicao'] as const) {
    const v = inteiroPositivo(o[campo]);
    if (v) p[campo] = v;
  }
  if (o.selos && typeof o.selos === 'object') {
    const selos: SelosDoJogador = {};
    for (const s of SELOS_DE_BUSCA) {
      const v = inteiroPositivo((o.selos as Record<string, unknown>)[s]);
      if (v) selos[s] = v;
    }
    if (Object.keys(selos).length) p.selos = selos;
  }
  if (o.materiais && typeof o.materiais === 'object' && !Array.isArray(o.materiais)) {
    const materiais: Record<string, number> = {};
    for (const [id, q] of Object.entries(o.materiais as Record<string, unknown>)) {
      const v = inteiroPositivo(q);
      if (v && (MATERIAIS_MAP[id] || MATERIAIS_MUNDO_MAP[id])) materiais[id] = v;
    }
    if (Object.keys(materiais).length) p.materiais = materiais;
  }
  const titulos = titulosDoDocumento(o.titulos);
  if (titulos) p.titulos = titulos;
  const cartas = lerCartasPersonagem(o.cartas, [], []).itens;
  if (cartas.length) p.cartas = cartas;
  const emblemas = lerEmblemasPersonagem(o.emblemas, []).itens;
  if (emblemas.length) p.emblemas = emblemas;
  const armas = lerArmasPersonagem(o.armas);
  if (armas.length) p.armas = armas;
  const armaduras = lerArmadurasPersonagem(o.armaduras);
  if (armaduras.length) p.armaduras = armaduras;
  return presenteVazio(p) ? undefined : p;
}

/** Lê uma mensagem gravada (ou null se estiver quebrada). */
export function mensagemDoDocumento(bruto: unknown): MensagemDoCorreio | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const o = bruto as Record<string, unknown>;
  const { id, titulo, texto, de, criadaEm, expiraEm } = o;
  if (typeof id !== 'string' || !id || typeof titulo !== 'string' || typeof texto !== 'string' || typeof de !== 'string') return null;
  if (typeof criadaEm !== 'string' || typeof expiraEm !== 'string' || Number.isNaN(Date.parse(criadaEm)) || Number.isNaN(Date.parse(expiraEm))) return null;
  const presente = presenteDoDocumento(o.presente);
  return { id, titulo, texto, de, criadaEm, expiraEm, ...(presente ? { presente } : {}), ...(o.resgatada === true ? { resgatada: true } : {}) };
}

export function mensagensDoDocumento(bruto: unknown): MensagemDoCorreio[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = bruto.flatMap((m) => mensagemDoDocumento(m) ?? []);
  return lista.length ? lista.slice(-MENSAGENS_MAXIMAS) : undefined;
}

export function correioGeralDoDocumento(bruto: unknown): CorreioGeralDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: CorreioGeralDoJogador = {};
  for (const [id, v] of Object.entries(bruto as Record<string, unknown>)) if (v === 'resgatada' || v === 'apagada') saida[id] = v;
  return Object.keys(saida).length ? saida : undefined;
}

export const mensagemValida = (m: Pick<MensagemDoCorreio, 'expiraEm'>, agora: Date) => Date.parse(m.expiraEm) > agora.getTime();

/** O presente em linhas curtas, para a tela. */
export function textoDoPresente(p: PresenteDoCorreio | undefined): string[] {
  if (!p) return [];
  const linhas: string[] = [];
  const n = (v: number) => v.toLocaleString('pt-BR');
  if (p.ouro) linhas.push(`${n(p.ouro)} de ouro`);
  if (p.diamantes) linhas.push(`${n(p.diamantes)} Diamantes`);
  if (p.essenciaDeSoberano) linhas.push(`${n(p.essenciaDeSoberano)} de Essência de Soberano`);
  for (const s of SELOS_DE_BUSCA) if (p.selos?.[s]) linhas.push(`${n(p.selos[s]!)}× ${NOME_DO_SELO[s]}`);
  if (p.fragmentosDeMemoria) linhas.push(`${n(p.fragmentosDeMemoria)} Fragmentos de Memória`);
  if (p.pedrasDaRecordacao) linhas.push(`${n(p.pedrasDaRecordacao)} Pedras da Recordação`);
  if (p.avancosDeExpedicao) linhas.push(`${n(p.avancosDeExpedicao)} Avanços de expedição`);
  for (const [id, q] of Object.entries(p.materiais ?? {})) linhas.push(`${n(q)}× ${MATERIAIS_MAP[id]?.nome ?? MATERIAIS_MUNDO_MAP[id]?.nome ?? id}`);
  for (const t of p.titulos ?? []) linhas.push(`Título: ${TITULO_MAP[t]?.nome ?? t}`);
  for (const c of p.cartas ?? []) linhas.push(`Carta: ${TIPO_DE_CARTA_MAP[c.tipo]?.nome ?? c.tipo}`);
  for (const e of p.emblemas ?? []) linhas.push(`Emblema ${TIPO_EMBLEMA_MAP[e.tipo]?.nome ?? e.tipo} (${e.estrelas}★)`);
  for (const a of p.armas ?? []) linhas.push(`Arma: ${ARMAS_BASE_MAP[a.baseId]?.nomes?.[a.categoria] ?? a.baseId}`);
  for (const a of p.armaduras ?? []) linhas.push(`Armadura: ${PECAS_ARMADURA_MAP[a.pecaId]?.nome ?? a.pecaId}`);
  return linhas;
}
