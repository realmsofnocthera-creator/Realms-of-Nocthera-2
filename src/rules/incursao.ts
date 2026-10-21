import type { Attributes } from './attributes';
import { MULT_CHAVE, PERFIS, pontosDeReferencia } from './cacada';
import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { MonsterDefinition } from './monsters';

/**
 * Incursões de guilda (7.3, decididas pelo Yuri em 21/10/2026): liberam no nível Reconhecida. Cada membro luta no
 * combate normal (até 3 lutas por dia) e o dano entra numa vida global do chefe, que não se recupera entre as lutas.
 * Com o chefe derrotado, quem lutou recebe a recompensa (parte fixa + bônus pelo dano) e a guilda passa ao próximo
 * nível. São 100 níveis: 10 chefes em 10 dificuldades (depois do 10º chefe, volta ao 1º na dificuldade seguinte),
 * com os atributos subindo a cada dificuldade.
 */

export const DIFICULDADES_DA_INCURSAO = ['Iniciante', 'Muito fácil', 'Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Extremamente difícil', 'Impossível', 'Pesadelo', 'Inferno'] as const;
export const NIVEIS_DE_INCURSAO = 100;
export const LUTAS_DE_INCURSAO_POR_DIA = 3;
/** Nível da guilda em que as Incursões abrem (Reconhecida). */
export const NIVEL_DA_GUILDA_PARA_INCURSOES = 2;

export interface ChefeDeIncursao {
  id: string;
  nome: string;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  tipoDano: 'fisico' | 'magico';
}

/** Os 10 chefes são PROVISÓRIOS (a confirmar): o Yuri passa nomes, mecânicas e visual depois. */
export const CHEFES_DE_INCURSAO: readonly ChefeDeIncursao[] = [
  { id: 'incursao-chefe-1', nome: 'Chefe de Incursão I (a confirmar)', categoriaCorporal: 'feral', tipoDano: 'fisico' },
  { id: 'incursao-chefe-2', nome: 'Chefe de Incursão II (a confirmar)', categoriaCorporal: 'rochoso', elementoAtaque: 'terra', tipoDano: 'fisico' },
  { id: 'incursao-chefe-3', nome: 'Chefe de Incursão III (a confirmar)', categoriaCorporal: 'eterio', elementoAtaque: 'sombrio', tipoDano: 'magico' },
  { id: 'incursao-chefe-4', nome: 'Chefe de Incursão IV (a confirmar)', categoriaCorporal: 'escamoso', elementoAtaque: 'fogo', tipoDano: 'fisico' },
  { id: 'incursao-chefe-5', nome: 'Chefe de Incursão V (a confirmar)', categoriaCorporal: 'cristalino', elementoAtaque: 'gelo', tipoDano: 'magico' },
  { id: 'incursao-chefe-6', nome: 'Chefe de Incursão VI (a confirmar)', categoriaCorporal: 'blindadoPesado', tipoDano: 'fisico' },
  { id: 'incursao-chefe-7', nome: 'Chefe de Incursão VII (a confirmar)', categoriaCorporal: 'amorfo', elementoAtaque: 'relampago', tipoDano: 'magico' },
  { id: 'incursao-chefe-8', nome: 'Chefe de Incursão VIII (a confirmar)', categoriaCorporal: 'quitinoso', elementoAtaque: 'vento', tipoDano: 'fisico' },
  { id: 'incursao-chefe-9', nome: 'Chefe de Incursão IX (a confirmar)', categoriaCorporal: 'blindagemMedia', elementoAtaque: 'sagrado', tipoDano: 'magico' },
  { id: 'incursao-chefe-10', nome: 'Chefe de Incursão X (a confirmar)', categoriaCorporal: 'organicoDesprotegido', elementoAtaque: 'sombrio', tipoDano: 'fisico' },
];

export interface NivelDeIncursao {
  /** 1 a 100. */
  nivel: number;
  chefe: ChefeDeIncursao;
  /** 0 a 9 (Iniciante a Inferno). */
  dificuldade: number;
  nomeDaDificuldade: string;
}

export function nivelDeIncursao(nivel: number): NivelDeIncursao {
  const n = Math.min(NIVEIS_DE_INCURSAO, Math.max(1, Math.floor(nivel)));
  const dificuldade = Math.floor((n - 1) / CHEFES_DE_INCURSAO.length);
  return { nivel: n, chefe: CHEFES_DE_INCURSAO[(n - 1) % CHEFES_DE_INCURSAO.length], dificuldade, nomeDaDificuldade: DIFICULDADES_DA_INCURSAO[dificuldade] };
}

/**
 * Força (proposta, a confirmar): dentro da dificuldade, o chefe k (0 a 9) usa o nível de referência 10 + 2k da Caçada
 * (10 a 28); cada dificuldade multiplica vida e atributos por 1,25 (Inferno ≈ 7,5×). O mesmo chefe é sempre mais forte
 * na dificuldade seguinte; o 1º chefe de uma dificuldade é mais fraco que o 10º da anterior (o ciclo recomeça).
 */
export const MULTIPLICADOR_POR_DIFICULDADE = 1.25;
/** A vida global é a vida de um chefe "de uma luta" vezes este fator (proposta, a confirmar). */
export const FATOR_DA_VIDA_GLOBAL = 30;

export function multiplicadorDaDificuldade(dificuldade: number): number {
  return MULTIPLICADOR_POR_DIFICULDADE ** dificuldade;
}

/** O chefe do nível com a vida de uma luta (a vida global é ela vezes FATOR_DA_VIDA_GLOBAL). */
export function montarChefeDeIncursao(nivel: number): MonsterDefinition {
  const { chefe, dificuldade, nivel: n } = nivelDeIncursao(nivel);
  const k = (n - 1) % CHEFES_DE_INCURSAO.length;
  const ref = 10 + 2 * k;
  const mult = multiplicadorDaDificuldade(dificuldade);
  const p = pontosDeReferencia(ref) * mult;
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
  return {
    id: chefe.id,
    nome: chefe.nome,
    nivel: Math.min(30, ref),
    hp: Math.round(p * perfil.hp * MULT_CHAVE.hp),
    chefe: true,
    categoriaCorporal: chefe.categoriaCorporal,
    atributos,
    xpConcedido: 0,
    ouroConcedido: { min: 0, max: 0 },
    modificadoresElementais: {},
    ...(chefe.elementoAtaque ? { elementoAtaque: chefe.elementoAtaque } : {}),
  };
}

export const vidaGlobalDoNivel = (nivel: number) => montarChefeDeIncursao(nivel).hp * FATOR_DA_VIDA_GLOBAL;

export interface ParticipanteDaIncursao {
  uid: string;
  nome: string;
  dano: number;
  lutas: number;
}

/** O estado da incursão dentro do documento da guilda. */
export interface IncursaoDaGuilda {
  nivel: number;
  hpMax: number;
  hp: number;
  participantes: ParticipanteDaIncursao[];
  /** A última vitória, para a tela contar o que aconteceu. */
  ultima?: { nivel: number; chefe: string; dificuldade: string; em: string };
}

export function incursaoNova(nivel: number): IncursaoDaGuilda {
  const hpMax = vidaGlobalDoNivel(nivel);
  return { nivel, hpMax, hp: hpMax, participantes: [] };
}

/**
 * Recompensa de cada participante (proposta, a confirmar). Parte fixa para quem lutou e um bônus repartido pelo dano:
 * - ouro: 100 + 40 × nível fixo, e o mesmo valor × participantes repartido pelo dano;
 * - XP: 10% do XP do próximo nível do jogador fixo, e até mais 15% pelo dano (a parte do dano dele);
 * - 1 material (raro até Médio, muito raro de Difícil para cima);
 * - diamantes: 2 + dificuldade;
 * - para a guilda: 100 × (dificuldade + 1) de XP de guilda.
 */
export function recompensaDaIncursao(nivel: number, parteDoDano: number, participantes: number, bonusPercentual = 0) {
  const { dificuldade } = nivelDeIncursao(nivel);
  const fator = (100 + bonusPercentual) / 100;
  const ouroFixo = 100 + 40 * nivel;
  return {
    ouro: Math.floor((ouroFixo + ouroFixo * participantes * parteDoDano) * fator),
    /** Frações do XP do próximo nível do jogador. */
    fracaoDeXp: (0.1 + 0.15 * parteDoDano) * fator,
    raridadeDoMaterial: dificuldade >= 4 ? ('muitoRaro' as const) : ('raro' as const),
    diamantes: Math.floor((2 + dificuldade) * fator),
  };
}

export const xpDeGuildaDaIncursao = (nivel: number) => 100 * (nivelDeIncursao(nivel).dificuldade + 1);

/** Lê a incursão do documento com tolerância. */
export function incursaoDoDocumento(bruto: unknown): IncursaoDaGuilda | undefined {
  if (typeof bruto !== 'object' || bruto === null) return undefined;
  const d = bruto as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const nivel = num(d.nivel);
  const hpMax = num(d.hpMax);
  const hp = num(d.hp);
  if (!nivel || nivel > NIVEIS_DE_INCURSAO || !hpMax || hp === null) return undefined;
  const participantes = (Array.isArray(d.participantes) ? d.participantes : []).flatMap((p) => {
    const o = p as Record<string, unknown> | null;
    return o && typeof o.uid === 'string' && typeof o.nome === 'string' ? [{ uid: o.uid, nome: o.nome, dano: num(o.dano) ?? 0, lutas: num(o.lutas) ?? 0 }] : [];
  });
  const u = d.ultima as Record<string, unknown> | undefined;
  const ultima = u && typeof u.chefe === 'string' && typeof u.nivel === 'number' ? { nivel: u.nivel, chefe: u.chefe, dificuldade: String(u.dificuldade ?? ''), em: String(u.em ?? '') } : undefined;
  return { nivel, hpMax, hp: Math.min(hp, hpMax), participantes, ...(ultima ? { ultima } : {}) };
}
