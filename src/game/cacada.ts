import { GAME_CONFIG } from '@/rules/config';
import {
  DADOS_CACADA_MAP,
  ESTRELAS_CACADA,
  EstrelaCacada,
  MONSTROS_CACADA_MAP,
  MonstroCacadaDados,
  RanqueCacada,
} from '@/rules/cacada';
import { MATERIAIS_MAP } from '@/rules/materiais';
import { RARIDADE_MAP, RaridadeMaterial } from '@/rules/raridades';
import { CUSTOMIZACAO } from '@/rules/armas';
import { BILHETE_DE_MELHORIA, diversosDaRaridade } from './forja';
import type { MonsterDefinition } from '@/rules/monsters';

/**
 * Provação da Caçada — regras puras (sem banco): liberação das estrelas, XP com a trava contra farm
 * e sorteio dos drops. Decididas pelo Yuri em 12/10/2026.
 */

export type MotivoBloqueioEstrela = 'estrelaInvalida' | 'nivelInsuficiente' | 'chaveAnteriorPendente';

/**
 * Uma estrela abre com o nível mínimo e o monstro-chave da estrela anterior vencido.
 * A 1★ só pede o nível; a 6★ (ranque alto) pede o nível 20 e o chave da 5★.
 */
export function estadoDaEstrela(
  estrela: number,
  nivel: number,
  chavesVencidas: readonly number[] | undefined
): { liberada: true } | { liberada: false; motivo: MotivoBloqueioEstrela } {
  const def = ESTRELAS_CACADA.find((e) => e.estrela === estrela);
  if (!def) return { liberada: false, motivo: 'estrelaInvalida' };
  if (nivel < def.nivelMinimo) return { liberada: false, motivo: 'nivelInsuficiente' };
  if (estrela > 1 && !(chavesVencidas ?? []).includes(estrela - 1)) {
    return { liberada: false, motivo: 'chaveAnteriorPendente' };
  }
  return { liberada: true };
}

export function estrelasLiberadas(nivel: number, chavesVencidas: readonly number[] | undefined): number[] {
  return ESTRELAS_CACADA.filter((e) => estadoDaEstrela(e.estrela, nivel, chavesVencidas).liberada).map((e) => e.estrela);
}

/** O ranque abre quando a primeira estrela dele abre (baixo: 1★ no nível 2; alto: 6★). */
export function ranqueLiberado(ranque: RanqueCacada, nivel: number, chavesVencidas: readonly number[] | undefined): boolean {
  const primeira = ESTRELAS_CACADA.find((e) => e.ranque === ranque);
  return !!primeira && estadoDaEstrela(primeira.estrela, nivel, chavesVencidas).liberada;
}

/**
 * XP curto da Caçada com a trava contra farm: cheio até o nível mínimo da estrela + 3; depois cai 25% por nível.
 * Ex.: 1★ (nível 2): cheio do 2 ao 5, 75% no 6, 50% no 7, 25% no 8 e zero do 9 em diante.
 */
export function xpDaCacada(xpBase: number, nivelMinimoEstrela: number, nivelPersonagem: number): number {
  const acima = nivelPersonagem - (nivelMinimoEstrela + GAME_CONFIG.CACADA_XP_NIVEIS_CHEIOS);
  if (acima <= 0) return xpBase;
  const percentual = Math.max(0, 100 - acima * GAME_CONFIG.CACADA_XP_QUEDA_POR_NIVEL_PERCENTUAL);
  return Math.floor((xpBase * percentual) / 100);
}

export interface DropSorteado {
  materialId: string;
  quantidade: number;
}

/**
 * Sorteia os drops de uma vitória: o Comum é garantido; cada outro material cai com a chance da raridade
 * mais o bônus de drop da Sorte (em pontos percentuais). `sorteio(i)` devolve um número em [0, 100).
 */
export function sortearDrops(
  drops: readonly string[],
  sorteio: (indice: number) => number,
  bonusChancePercentual = 0
): DropSorteado[] {
  const resultado: DropSorteado[] = [];
  drops.forEach((id, i) => {
    const material = MATERIAIS_MAP[id];
    if (!material) return;
    const chance = material.raridade === 'comum' ? 100 : RARIDADE_MAP[material.raridade].chancePercentual + bonusChancePercentual;
    if (material.raridade === 'comum' || sorteio(i) < chance) {
      resultado.push({ materialId: id, quantidade: 1 });
    }
  });
  return resultado;
}

/** Chance, por vitória, de cair um diverso de mundo (um dos dois) em cada raridade que o monstro dropa. */
export const CHANCE_DIVERSO_PERCENTUAL = 1;
/** Os sorteios dos extras começam aqui, depois dos sorteios dos materiais do monstro. */
const INDICE_SORTEIO_EXTRAS = 50;

/**
 * Extras de uma vitória na Caçada: para cada raridade que o monstro dropa, 1% de cair um dos dois diversos
 * de mundo daquela raridade; nos monstros 9★, 1% de cair um Bilhete de melhoria.
 * `bonusDiversoPontos` soma pontos percentuais à chance do diverso (Entomologista, habilidade de armadura).
 */
export function sortearDropsExtras(
  drops: readonly string[],
  estrela: number,
  sorteio: (indice: number) => number,
  bonusDiversoPontos = 0
): DropSorteado[] {
  const resultado: DropSorteado[] = [];
  const raridades = [...new Set(drops.map((id) => MATERIAIS_MAP[id]?.raridade).filter((r): r is RaridadeMaterial => !!r))];
  let i = INDICE_SORTEIO_EXTRAS;
  for (const raridade of raridades) {
    const cai = sorteio(i++) < CHANCE_DIVERSO_PERCENTUAL + bonusDiversoPontos;
    const escolha = sorteio(i++);
    const opcoes = diversosDaRaridade(raridade);
    if (cai && opcoes.length > 0) {
      resultado.push({ materialId: opcoes[Math.min(opcoes.length - 1, Math.floor((escolha / 100) * opcoes.length))], quantidade: 1 });
    }
  }
  if (estrela === 9 && sorteio(i) < CUSTOMIZACAO.chanceBilhete9EstrelasPercentual) {
    resultado.push({ materialId: BILHETE_DE_MELHORIA.id, quantidade: 1 });
  }
  return resultado;
}

/** Gerador determinístico dos drops a partir da semente do combate (o drop é reproduzível e não vem do cliente). */
export function sorteioDeDrops(seed: number): (indice: number) => number {
  let s = (Math.abs(Math.floor(seed)) ^ 0x5bd1e995) >>> 0 || 7;
  const valores: number[] = [];
  return (indice: number) => {
    while (valores.length <= indice) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      valores.push((s / 4294967296) * 100);
    }
    return valores[indice];
  };
}

export type MotivoBloqueioCacada = MotivoBloqueioEstrela | 'monstroInvalido';

export const MENSAGEM_BLOQUEIO_CACADA: Readonly<Record<MotivoBloqueioCacada, string>> = {
  monstroInvalido: 'Monstro da Caçada inválido',
  estrelaInvalida: 'Estrela da Caçada inválida',
  nivelInsuficiente: 'Nível insuficiente para esta estrela da Caçada',
  chaveAnteriorPendente: 'Vença o monstro-chave da estrela anterior para liberar esta estrela',
};

export type EntradaCacada =
  | { ok: true; monstro: MonsterDefinition; dados: MonstroCacadaDados; estrela: EstrelaCacada }
  | { ok: false; motivo: MotivoBloqueioCacada };

/** Confere, no servidor, se o personagem pode caçar este monstro (estrela liberada pelo nível e pelo progresso). */
export function validarEntradaCacada(
  monstroId: unknown,
  nivel: number,
  chavesVencidas: readonly number[] | undefined
): EntradaCacada {
  if (typeof monstroId !== 'string' || !MONSTROS_CACADA_MAP[monstroId]) return { ok: false, motivo: 'monstroInvalido' };
  const dados = DADOS_CACADA_MAP[monstroId];
  const estado = estadoDaEstrela(dados.estrela, nivel, chavesVencidas);
  if (!estado.liberada) return { ok: false, motivo: estado.motivo };
  const estrela = ESTRELAS_CACADA.find((e) => e.estrela === dados.estrela) as EstrelaCacada;
  return { ok: true, monstro: MONSTROS_CACADA_MAP[monstroId], dados, estrela };
}
