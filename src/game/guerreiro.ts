import { MULT_CHAVE, PERFIS, pontosDeReferencia } from '@/rules/cacada';
import type { Attributes } from '@/rules/attributes';
import { EMBLEMA_RARIDADES, EmblemaRaridade } from '@/rules/emblemas';
import { CHEFE_GUERREIRO_POR_DIFICULDADE, ChefeGuerreiro } from '@/rules/guerreiroChefes';
import type { MonsterDefinition } from '@/rules/monsters';
import { PROVACOES } from '@/rules/provacoes';
import { diaDeBrasilia } from './batalhaSangrenta';

/**
 * Provação do Guerreiro — regras puras (sem banco). Decididas pelo Yuri em 14/10/2026: 10 dificuldades, um chefe
 * por dificuldade com mecânica única, luta única, 1 tentativa por dia por chefe; cada vitória dá 4 emblemas, e
 * quanto maior a dificuldade, melhores e mais raros eles são.
 */
export const GUERREIRO = {
  dificuldades: 10,
  emblemasPorVitoria: 4,
  tentativasPorDiaPorChefe: 1,
  /** Nível de referência do chefe da dificuldade 1; sobe 2 níveis por dificuldade (30 na décima). */
  nivelDeReferenciaInicial: 12,
  niveisPorDificuldade: 2,
} as const;

/** Nível pedido pela vitrine das Provações (src/rules/provacoes.ts). */
export const NIVEL_GUERREIRO = PROVACOES.find((p) => p.id === 'guerreiro')?.nivelRequerido ?? 12;

/**
 * Chance (%) de cada raridade por emblema, por dificuldade. Só entram as raridades que a dificuldade pode dar
 * (lista do Yuri); as chances são PROPOSTA a aprovar. Cada linha soma 100.
 */
export const CHANCE_EMBLEMA_POR_DIFICULDADE: Readonly<Record<number, Partial<Record<EmblemaRaridade, number>>>> = {
  1: { comum: 100 },
  2: { comum: 70, raro: 30 },
  3: { comum: 55, raro: 45 },
  4: { comum: 50, raro: 35, muitoRaro: 15 },
  5: { raro: 70, muitoRaro: 30 },
  6: { raro: 50, muitoRaro: 35, epico: 15 },
  7: { raro: 40, muitoRaro: 35, epico: 20, lendario: 5 },
  8: { muitoRaro: 55, epico: 35, lendario: 10 },
  9: { muitoRaro: 45, epico: 40, lendario: 15 },
  10: { muitoRaro: 40, epico: 35, lendario: 20, mitico: 5 },
};

export type MotivoBloqueioGuerreiro =
  | 'dificuldadeInvalida'
  | 'nivelInsuficiente'
  | 'dificuldadeBloqueada'
  | 'semTentativa';

export const MENSAGEM_BLOQUEIO_GUERREIRO: Readonly<Record<MotivoBloqueioGuerreiro, string>> = {
  dificuldadeInvalida: 'Dificuldade da Provação do Guerreiro inválida',
  nivelInsuficiente: 'Nível insuficiente para a Provação do Guerreiro',
  dificuldadeBloqueada: 'Vença o chefe da dificuldade anterior da Provação do Guerreiro para liberar este',
  semTentativa: 'Você já enfrentou este chefe hoje',
};

export function ehDificuldadeGuerreiro(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= GUERREIRO.dificuldades;
}

/** A 1 abre com o nível; as outras abrem ao vencer o chefe da anterior. */
export function dificuldadeLiberadaGuerreiro(dificuldade: number, vencidas: readonly number[] | undefined): boolean {
  return dificuldade === 1 || (vencidas ?? []).includes(dificuldade - 1);
}

/** Tentativas do dia: cada chefe tem 1 por dia (o dia vale em Brasília). */
export function tentativaDisponivel(tentativas: Readonly<Record<string, string>> | undefined, dificuldade: number, agora: Date): boolean {
  return tentativas?.[String(dificuldade)] !== diaDeBrasilia(agora);
}

export function conferirEntradaGuerreiro(
  dificuldade: unknown,
  nivel: number,
  tentativas: Readonly<Record<string, string>> | undefined,
  vencidas: readonly number[] | undefined,
  agora: Date
): { ok: true; dificuldade: number; chefe: ChefeGuerreiro } | { ok: false; motivo: MotivoBloqueioGuerreiro } {
  if (!ehDificuldadeGuerreiro(dificuldade)) return { ok: false, motivo: 'dificuldadeInvalida' };
  if (nivel < NIVEL_GUERREIRO) return { ok: false, motivo: 'nivelInsuficiente' };
  if (!dificuldadeLiberadaGuerreiro(dificuldade, vencidas)) return { ok: false, motivo: 'dificuldadeBloqueada' };
  if (!tentativaDisponivel(tentativas, dificuldade, agora)) return { ok: false, motivo: 'semTentativa' };
  return { ok: true, dificuldade, chefe: CHEFE_GUERREIRO_POR_DIFICULDADE[dificuldade] };
}

/** Sorteia as raridades dos 4 emblemas de uma vitória. `sorteio(i)` devolve um número em [0, 100) para o emblema i. */
export function sortearEmblemas(dificuldade: number, sorteio: (indice: number) => number): Record<EmblemaRaridade, number> {
  const tabela = CHANCE_EMBLEMA_POR_DIFICULDADE[dificuldade] ?? { comum: 100 };
  const faixas = EMBLEMA_RARIDADES.filter((r) => (tabela[r.id] ?? 0) > 0);
  const resultado = Object.fromEntries(EMBLEMA_RARIDADES.map((r) => [r.id, 0])) as Record<EmblemaRaridade, number>;
  for (let i = 0; i < GUERREIRO.emblemasPorVitoria; i++) {
    const valor = sorteio(i);
    let acumulado = 0;
    let escolhida = faixas[faixas.length - 1]?.id ?? 'comum';
    for (const r of faixas) {
      acumulado += tabela[r.id] ?? 0;
      if (valor < acumulado) {
        escolhida = r.id;
        break;
      }
    }
    resultado[escolhida] += 1;
  }
  return resultado;
}

export function nivelDeReferenciaDoChefe(dificuldade: number): number {
  return GUERREIRO.nivelDeReferenciaInicial + GUERREIRO.niveisPorDificuldade * (dificuldade - 1);
}

/**
 * Monta o chefe da dificuldade: vida e atributos pela conta do monstro-chave da Caçada no nível de referência
 * (12 a 30), Enfurecido, com a mecânica própria. Chefes magos põem o dano na Inteligência. Não dá ouro nem XP.
 */
export function montarChefeGuerreiro(dificuldade: number): MonsterDefinition {
  const c = CHEFE_GUERREIRO_POR_DIFICULDADE[dificuldade];
  if (!c) throw new Error(`Dificuldade do Guerreiro inválida: ${dificuldade}`);
  const ref = nivelDeReferenciaDoChefe(dificuldade);
  const p = pontosDeReferencia(ref);
  const perfil = PERFIS.normal;
  const dano = Math.max(1, Math.round(p * perfil.forca * MULT_CHAVE.forca));
  const atributos: Attributes = {
    vigor: Math.round(p * 0.2),
    sorte: 0,
    forca: c.tipoDano === 'fisico' ? dano : 1,
    vitalidade: Math.round(p * perfil.vitalidade),
    arcano: 0,
    inteligencia: c.tipoDano === 'magico' ? dano : 0,
    agilidade: Math.max(1, Math.round(p * perfil.agilidade)),
  };
  return {
    id: c.id,
    nome: c.nome,
    nivel: Math.min(30, ref),
    hp: Math.round(p * perfil.hp * MULT_CHAVE.hp),
    chefe: true,
    categoriaCorporal: c.categoriaCorporal,
    atributos,
    xpConcedido: 0,
    ouroConcedido: { min: 0, max: 0 },
    modificadoresElementais: {},
    ...(c.elementoAtaque ? { elementoAtaque: c.elementoAtaque } : {}),
    mecanica: c.mecanica,
    enfurecido: true,
  };
}
