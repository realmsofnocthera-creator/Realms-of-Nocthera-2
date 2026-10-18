import type { MapaDados } from '@/rules/mapa';
import { objetoCobre } from '@/rules/objetosDoMapa';
import { dentroDoMapa, tileLivre } from '@/rules/passagem';
import { tilesAlcancaveis } from '@/rules/verificarMapa';

/**
 * Campanha (5.5-3 e 5.5-8), regras puras: o progresso do jogador no mundo e as ações que o servidor confere.
 * O jogador anda livre no celular; o servidor guarda a posição só nos "checkpoints" (ao parar, ao agir) e confere
 * as ações que valem (baú, porta): o objeto precisa existir no mapa PUBLICADO e estar perto da última posição
 * salva ("confiança leve", decidida com o Yuri em 17/10/2026 por causa da cota do plano gratuito do Firebase).
 */
export interface ProgressoDaCampanha {
  mapaId: string;
  x: number;
  y: number;
  /** Baús já abertos, como "mapa:objeto" (cada baú abre uma vez por personagem). */
  baus: string[];
  atualizadoEm: string;
}

/** Quantos baús abertos guardamos por personagem (o documento do banco tem tamanho máximo). */
export const MAXIMO_DE_BAUS_GUARDADOS = 1000;
/** Distância máxima (em tiles, nos dois eixos) entre a posição salva e o objeto para agir; dá folga para o atraso do celular. */
export const DISTANCIA_DE_INTERACAO = 2;

export type ResultadoDaCampanha<T> = ({ ok: true } & T) | { ok: false; erro: string };

export const chaveDoBau = (mapaId: string, objetoId: string) => `${mapaId}:${objetoId}`;

/** Onde o jogador nasce no mapa: o início do jogador ou, sem ele, o primeiro tile livre. */
export function posicaoInicialDoMapa(mapa: MapaDados): { x: number; y: number } {
  const inicio = mapa.objetos.find((o) => o.tipo === 'inicio');
  if (inicio) return { x: inicio.x, y: inicio.y };
  for (let y = 0; y < mapa.altura; y++) for (let x = 0; x < mapa.largura; x++) if (tileLivre(mapa, x, y)) return { x, y };
  return { x: 0, y: 0 };
}

export function progressoInicial(mapaId: string, mapa: MapaDados, agora: string): ProgressoDaCampanha {
  return { mapaId, ...posicaoInicialDoMapa(mapa), baus: [], atualizadoEm: agora };
}

const perto = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) <= DISTANCIA_DE_INTERACAO && Math.abs(a.y - b.y) <= DISTANCIA_DE_INTERACAO;

/**
 * Salva a posição (checkpoint). Só vale dentro do mesmo mapa, num tile livre e ligado por caminho livre à posição
 * anterior: não dá para atravessar parede nem sair do mapa por aqui (para isso há as portas).
 */
export function planejarPosicao(atual: ProgressoDaCampanha, mapa: MapaDados, para: { mapaId: unknown; x: unknown; y: unknown }, agora: string): ResultadoDaCampanha<{ progresso: ProgressoDaCampanha }> {
  if (para.mapaId !== atual.mapaId) return { ok: false, erro: 'Você não está nesse mapa.' };
  if (typeof para.x !== 'number' || typeof para.y !== 'number' || !Number.isInteger(para.x) || !Number.isInteger(para.y)) return { ok: false, erro: 'Posição inválida.' };
  if (!dentroDoMapa(mapa, para.x, para.y) || !tileLivre(mapa, para.x, para.y)) return { ok: false, erro: 'Não dá para ficar nesse lugar.' };
  if (tileLivre(mapa, atual.x, atual.y) && !tilesAlcancaveis(mapa, atual.x, atual.y).has(para.y * mapa.largura + para.x)) {
    return { ok: false, erro: 'Não há caminho livre até esse lugar.' };
  }
  return { ok: true, progresso: { ...atual, x: para.x, y: para.y, atualizadoEm: agora } };
}

/**
 * A posição que o celular manda junto com uma ação (baú, porta): vale como checkpoint, nas mesmas regras de
 * `planejarPosicao`. Assim a ação grava uma vez só, em vez de um checkpoint e depois a ação. Sem posição, a ação usa
 * a posição já salva.
 */
export function aplicarPosicaoDaAcao(atual: ProgressoDaCampanha, mapa: MapaDados, posicao: unknown, agora: string): ResultadoDaCampanha<{ progresso: ProgressoDaCampanha }> {
  if (posicao === undefined || posicao === null) return { ok: true, progresso: atual };
  if (typeof posicao !== 'object' || Array.isArray(posicao)) return { ok: false, erro: 'Posição inválida.' };
  const p = posicao as Record<string, unknown>;
  return planejarPosicao(atual, mapa, { mapaId: p.mapaId, x: p.x, y: p.y }, agora);
}

/** Abre um baú: o baú precisa estar no mapa, perto da posição salva e ainda fechado. */
export function planejarBau(atual: ProgressoDaCampanha, mapa: MapaDados, objetoId: unknown, agora: string): ResultadoDaCampanha<{ progresso: ProgressoDaCampanha; item: { id: string; qtd: number } }> {
  const bau = typeof objetoId === 'string' ? mapa.objetos.find((o) => o.id === objetoId && o.tipo === 'bau') : undefined;
  if (!bau || !bau.item) return { ok: false, erro: 'Não há baú aí.' };
  if (!perto(atual, bau)) return { ok: false, erro: 'Chegue mais perto do baú.' };
  const chave = chaveDoBau(atual.mapaId, bau.id);
  if (atual.baus.includes(chave)) return { ok: false, erro: 'Este baú já foi aberto.' };
  if (atual.baus.length >= MAXIMO_DE_BAUS_GUARDADOS) return { ok: false, erro: 'Não foi possível registrar o baú agora.' };
  return { ok: true, progresso: { ...atual, baus: [...atual.baus, chave], atualizadoEm: agora }, item: { ...bau.item } };
}

/**
 * Atravessa uma porta: a porta precisa estar no mapa e perto da posição salva, e o tile de chegada precisa estar livre
 * no mapa de destino (que precisa estar publicado: `destino` é null se não estiver).
 */
export function planejarPorta(
  atual: ProgressoDaCampanha,
  mapa: MapaDados,
  objetoId: unknown,
  destino: MapaDados | null,
  agora: string
): ResultadoDaCampanha<{ progresso: ProgressoDaCampanha }> {
  const porta = typeof objetoId === 'string' ? mapa.objetos.find((o) => o.id === objetoId && o.tipo === 'porta') : undefined;
  if (!porta || !porta.destino) return { ok: false, erro: 'Não há porta aí.' };
  if (!perto(atual, porta)) return { ok: false, erro: 'Chegue mais perto da porta.' };
  if (!destino) return { ok: false, erro: 'Esta passagem está fechada por enquanto.' };
  if (!dentroDoMapa(destino, porta.destino.x, porta.destino.y) || !tileLivre(destino, porta.destino.x, porta.destino.y)) {
    return { ok: false, erro: 'Esta passagem está fechada por enquanto.' };
  }
  return { ok: true, progresso: { ...atual, mapaId: porta.destino.mapa, x: porta.destino.x, y: porta.destino.y, atualizadoEm: agora } };
}

/** A posição está dentro de uma área de monstros do mapa? (para as lutas, parte seguinte da Campanha) */
export function areaDeMonstrosNaPosicao(mapa: MapaDados, x: number, y: number, objetoId: unknown) {
  return mapa.objetos.find((o) => o.id === objetoId && o.tipo === 'cacada' && objetoCobre(o, x, y));
}
