import type { Attributes } from './attributes';
import { MULT_CHAVE, PERFIS, pontosDeReferencia } from './cacada';
import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { EmblemaRaridade } from './emblemas';
import type { MonsterDefinition } from './monsters';

/**
 * Chefe de guildas (7.3, decidido pelo Yuri em 21/10/2026): um chefe por semana, o mesmo para todas as guildas, aberto
 * a partir do nível Prestigiada. Cada membro luta quantas vezes quiser; vale o MAIOR dano de cada membro na semana, e
 * o dano da guilda é a soma desses maiores. No fim da semana (segunda-feira, 0h de Brasília) a guilda fica numa
 * posição, e quem lutou e ainda está nela resgata a recompensa da faixa: ouro, XP de guilda e, nas faixas de cima,
 * baús de emblemas.
 */

export const NIVEL_DA_GUILDA_PARA_CHEFE_SEMANAL = 4;
/** Quantas guildas o ranking da tela mostra. */
export const GUILDAS_NO_RANKING_SEMANAL = 10;

export interface ChefeSemanal {
  id: string;
  nome: string;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  tipoDano: 'fisico' | 'magico';
}

/** Chefes PROVISÓRIOS em rodízio, um por semana (a confirmar: o Yuri passa nomes, mecânicas e visual depois). */
export const CHEFES_SEMANAIS: readonly ChefeSemanal[] = [
  { id: 'chefe-semanal-1', nome: 'Chefe Semanal I (a confirmar)', categoriaCorporal: 'escamoso', elementoAtaque: 'fogo', tipoDano: 'fisico' },
  { id: 'chefe-semanal-2', nome: 'Chefe Semanal II (a confirmar)', categoriaCorporal: 'eterio', elementoAtaque: 'sombrio', tipoDano: 'magico' },
  { id: 'chefe-semanal-3', nome: 'Chefe Semanal III (a confirmar)', categoriaCorporal: 'rochoso', elementoAtaque: 'terra', tipoDano: 'fisico' },
  { id: 'chefe-semanal-4', nome: 'Chefe Semanal IV (a confirmar)', categoriaCorporal: 'cristalino', elementoAtaque: 'gelo', tipoDano: 'magico' },
];

/** Segunda-feira de referência para o rodízio. */
const SEGUNDA_DE_REFERENCIA = '2026-01-05';
const DIA_MS = 86_400_000;

const diaDeBrasilia = (data: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
const somarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T12:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);

/** A semana (id = a segunda-feira em que começa, no horário de Brasília). */
export function semanaDe(data: Date): string {
  const dia = diaDeBrasilia(data);
  const diaDaSemana = new Date(`${dia}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return somarDias(dia, -((diaDaSemana + 6) % 7));
}

/** A segunda-feira seguinte (quando a semana acaba). */
export const fimDaSemana = (semana: string) => somarDias(semana, 7);

export function chefeDaSemana(semana: string): ChefeSemanal {
  const semanas = Math.round((Date.parse(`${semana}T12:00:00Z`) - Date.parse(`${SEGUNDA_DE_REFERENCIA}T12:00:00Z`)) / (7 * DIA_MS));
  const n = CHEFES_SEMANAIS.length;
  return CHEFES_SEMANAIS[((semanas % n) + n) % n];
}

/** Vida "sem fim": a luta mede o dano (até a queda do jogador ou o limite de rodadas). */
export const VIDA_DO_CHEFE_SEMANAL = 1_000_000_000;

/**
 * O chefe da semana (força proposta, a confirmar): o monstro-chave da Caçada no nível 30, com 1,5× os atributos.
 * O Sobreescudo é o de uma luta com essa força, não 10% da vida sem fim.
 */
export function montarChefeSemanal(semana: string): MonsterDefinition {
  const chefe = chefeDaSemana(semana);
  const p = pontosDeReferencia(30) * 1.5;
  const perfil = PERFIS.normal;
  const dano = Math.max(1, Math.round(p * perfil.forca * MULT_CHAVE.forca));
  const atributos: Attributes = {
    vigor: Math.round(p * 0.2),
    sorte: 0,
    forca: chefe.tipoDano === 'fisico' ? dano : 1,
    vitalidade: Math.round(p * perfil.vitalidade),
    arcano: 0,
    inteligencia: chefe.tipoDano === 'magico' ? dano : 0,
    agilidade: Math.max(1, Math.round(p * perfil.agilidade)),
  };
  const vidaDeUmaLuta = Math.round(p * perfil.hp * MULT_CHAVE.hp);
  return {
    id: chefe.id,
    nome: chefe.nome,
    nivel: 30,
    hp: VIDA_DO_CHEFE_SEMANAL,
    sobreescudoInicial: Math.floor(vidaDeUmaLuta / 10),
    chefe: true,
    categoriaCorporal: chefe.categoriaCorporal,
    atributos,
    xpConcedido: 0,
    ouroConcedido: { min: 0, max: 0 },
    modificadoresElementais: {},
    ...(chefe.elementoAtaque ? { elementoAtaque: chefe.elementoAtaque } : {}),
  };
}

export interface FaixaDoChefeSemanal {
  /** Posições da faixa (de, até); null = sem limite. */
  de: number;
  ate: number | null;
  nome: string;
  /** Para cada membro que lutou. */
  ouro: number;
  /** Para a guilda (uma vez). */
  xpGuilda: number;
  /** Baús de emblemas para cada membro que lutou (cada baú = 1 emblema aleatório da raridade). */
  baus: { raridade: EmblemaRaridade; quantidade: number }[];
  /** Cartas da Alma para cada membro que lutou (a raridade de cada carta). */
  cartas: EmblemaRaridade[];
}

/**
 * Faixas do Yuri: 1º, 2º, 3º, 4–10, 11–50, 51–100 e 101+. Baús do 1º ao 3º decididos pelo Yuri (2 lendários; 1
 * lendário; 4 épicos); o resto ("e assim sucessivamente"), o ouro e o XP de guilda são PROPOSTA, a confirmar.
 */
export const FAIXAS_DO_CHEFE_SEMANAL: readonly FaixaDoChefeSemanal[] = [
  { de: 1, ate: 1, nome: '1º lugar', ouro: 20000, xpGuilda: 3000, baus: [{ raridade: 'lendario', quantidade: 2 }], cartas: ['mitico'] },
  { de: 2, ate: 2, nome: '2º lugar', ouro: 15000, xpGuilda: 2500, baus: [{ raridade: 'lendario', quantidade: 1 }], cartas: ['lendario'] },
  { de: 3, ate: 3, nome: '3º lugar', ouro: 12000, xpGuilda: 2000, baus: [{ raridade: 'epico', quantidade: 4 }], cartas: ['lendario'] },
  { de: 4, ate: 10, nome: '4º ao 10º', ouro: 8000, xpGuilda: 1500, baus: [{ raridade: 'epico', quantidade: 2 }], cartas: ['epico'] },
  { de: 11, ate: 50, nome: '11º ao 50º', ouro: 5000, xpGuilda: 1000, baus: [{ raridade: 'epico', quantidade: 1 }], cartas: ['muitoRaro'] },
  { de: 51, ate: 100, nome: '51º ao 100º', ouro: 3000, xpGuilda: 600, baus: [{ raridade: 'muitoRaro', quantidade: 2 }], cartas: ['raro'] },
  { de: 101, ate: null, nome: '101º em diante', ouro: 1500, xpGuilda: 300, baus: [], cartas: ['comum'] },
];

export const faixaDaPosicao = (posicao: number) => FAIXAS_DO_CHEFE_SEMANAL.find((f) => posicao >= f.de && (f.ate === null || posicao <= f.ate))!;

/** O registro da guilda na semana: chefeSemanal/{semana}/guildas/{guildaId}. */
export interface EntradaDoChefeSemanal {
  semana: string;
  guildaId: string;
  nomeDaGuilda: string;
  /** Soma dos maiores danos dos membros. */
  total: number;
  /** O maior dano de cada membro na semana. */
  membros: Record<string, { nome: string; dano: number; oculto?: boolean }>;
  /** O XP de guilda da faixa já foi entregue (no primeiro resgate). */
  xpEntregue?: boolean;
}

/** O total da guilda: o dano de quem está com limite silencioso (6.5-7, `oculto`) não conta. */
export const totalDosMembros = (membros: EntradaDoChefeSemanal['membros']) => Object.values(membros).reduce((s, m) => s + (m.oculto ? 0 : m.dano), 0);

export function entradaDoDocumento(bruto: unknown): EntradaDoChefeSemanal | null {
  if (typeof bruto !== 'object' || bruto === null) return null;
  const d = bruto as Record<string, unknown>;
  if (typeof d.semana !== 'string' || typeof d.guildaId !== 'string') return null;
  const membros: EntradaDoChefeSemanal['membros'] = {};
  if (typeof d.membros === 'object' && d.membros !== null) {
    for (const [uid, m] of Object.entries(d.membros as Record<string, unknown>)) {
      const o = m as Record<string, unknown> | null;
      if (o && typeof o.nome === 'string' && typeof o.dano === 'number' && Number.isFinite(o.dano) && o.dano >= 0) membros[uid] = { nome: o.nome, dano: Math.floor(o.dano), ...(o.oculto === true ? { oculto: true } : {}) };
    }
  }
  return { semana: d.semana, guildaId: d.guildaId, nomeDaGuilda: typeof d.nomeDaGuilda === 'string' ? d.nomeDaGuilda : '', total: totalDosMembros(membros), membros, ...(d.xpEntregue === true ? { xpEntregue: true } : {}) };
}

/** As semanas em que o personagem lutou (as 4 mais recentes) e se já resgatou. */
export interface ParticipacaoNoChefeSemanal {
  semana: string;
  guildaId: string;
  resgatada?: boolean;
}

export function participacoesDoDocumento(bruto: unknown): ParticipacaoNoChefeSemanal[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = bruto.flatMap((p) => {
    const o = p as Record<string, unknown> | null;
    return o && typeof o.semana === 'string' && typeof o.guildaId === 'string' ? [{ semana: o.semana, guildaId: o.guildaId, ...(o.resgatada === true ? { resgatada: true } : {}) }] : [];
  });
  return lista.length ? lista.slice(-4) : undefined;
}
