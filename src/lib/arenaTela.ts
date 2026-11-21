import { totalDeRodadas } from '@/rules/campeonato';
import { indiceDoRanque, RANQUES } from '@/rules/arenaRanqueada';
import { LUTAS_GRATIS_POR_DIA } from '@/rules/arena';
import type { LutaNaTela } from '@/server/campeonato';

/** Lógica das telas da Arena (cartões dos adversários, fichas de luta, tempo, a chave do Campeonato), sem React. */

export type TipoDoCartao = 'forte' | 'neutro' | 'fraco';

/** O adversário é mais forte (cartão dourado, seta para cima), igual ou mais fraco, pelos pontos: a diferença de 5% ou mais decide. */
export function tipoDoCartao(meusPontos: number, pontosDele: number): TipoDoCartao {
  const dif = (pontosDele - meusPontos) / Math.max(1, meusPontos);
  return dif >= 0.05 ? 'forte' : dif <= -0.05 ? 'fraco' : 'neutro';
}

export type Ficha = 'cheia' | 'ouro' | 'vazia';

/** As fichas de luta do dia: as grátis (azuis) e as compradas (douradas), cheias enquanto a luta não foi gasta. */
export function fichasDaArena(restantes: number, compradas: number, gratis = LUTAS_GRATIS_POR_DIA): Ficha[] {
  const total = gratis + Math.max(0, compradas);
  return Array.from({ length: total }, (_, i) => (i < restantes ? (i >= gratis ? 'ouro' : 'cheia') : 'vazia'));
}

/** "3d 04h", "4h 20min" ou "12min": quanto falta até `quando`. */
export function tempoAte(quando: string | Date, agora: Date = new Date()): string {
  const ms = Math.max(0, new Date(quando).getTime() - agora.getTime());
  const min = Math.floor(ms / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

/** Contagem curta de uma rodada do Campeonato: "03:42" (minutos e segundos). */
export function contagemCurta(quando: string | Date, agora: Date = new Date()): string {
  const s = Math.max(0, Math.floor((new Date(quando).getTime() - agora.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

/** O ranque do jogador, o próximo e o quanto já andou até ele (0 a 1). */
export function progressoDoRanque(pontos: number): { indice: number; proximo: number | null; progresso: number } {
  const indice = indiceDoRanque(pontos);
  const atual = RANQUES[indice];
  const prox = RANQUES[indice + 1];
  if (!prox) return { indice, proximo: null, progresso: 1 };
  return { indice, proximo: prox.minimo, progresso: Math.min(1, Math.max(0, (pontos - atual.minimo) / (prox.minimo - atual.minimo))) };
}

export interface PartidaNaChave {
  /** A luta (null = ainda não existe: a rodada não chegou). */
  luta: LutaNaTela | null;
  estado: 'eu' | 'fim' | 'vivo' | 'normal';
}

export interface ColunaDaChave {
  /** O índice da rodada na edição. */
  rodada: number;
  nome: string;
  partidas: PartidaNaChave[];
}

/**
 * As colunas da chave na tela: as 4 últimas rodadas (oitavas, quartas, semifinais e final; as anteriores só no replay) ou, quando
 * a disputa já está nas quartas, as 3 últimas. Cada coluna tem o número certo de partidas (8, 4, 2 e 1), com espaços vazios para as que
 * ainda não existem. `jogadores` é quem entrou; a rodada em disputa é a última com lutas.
 */
export function colunasDaChave(rodadas: readonly { nome: string; lutas: LutaNaTela[] }[], jogadores: number): ColunaDaChave[] {
  const total = Math.max(1, totalDeRodadas(Math.max(2, jogadores)));
  const atual = Math.max(0, rodadas.length - 1);
  const quantas = Math.min(total, atual >= total - 3 ? 3 : 4);
  const NOMES = ['Oitavas', 'Quartas', 'Semi', 'Final'];
  const primeira = total - quantas;
  return Array.from({ length: quantas }, (_, i) => {
    const r = primeira + i;
    const esperadas = 2 ** (total - 1 - r);
    const lutas = rodadas[r]?.lutas ?? [];
    const partidas: PartidaNaChave[] = Array.from({ length: esperadas }, (_, k) => {
      const luta = lutas[k] ?? null;
      const decidida = !!luta && luta.vencedor !== null;
      return { luta, estado: luta?.minha ? 'eu' : decidida ? 'fim' : luta ? 'vivo' : 'normal' };
    });
    return { rodada: r, nome: NOMES[NOMES.length - quantas + i] ?? rodadas[r]?.nome ?? `Rodada ${r + 1}`, partidas };
  });
}

/** Onde cada partida fica: `x` da coluna, `y` do topo e o fator de escala do cartão (78 x 59 na escala 1). */
export interface LugarDaPartida { x: number; y: number }
export interface FormaDaChave { escala: number; cabecalhos: { x: number; y: number; l: number }[]; colunas: LugarDaPartida[][] }

/** A chave de 4 colunas (cartões a 59% do tamanho, 8 partidas na primeira) ou de 3 (cartões inteiros, 4 na primeira). */
export function formaDaChave(quantas: 3 | 4): FormaDaChave {
  const grande = quantas === 3;
  const escala = grande ? 1 : 0.59;
  const altura = 59 * escala;
  const xs = grande ? [10, 140, 270] : [7, 95, 183, 271];
  const topo = grande ? 203 : 135;
  const passo = grande ? 64.3 : 37.5;
  const primeira = grande ? 4 : 8;
  const colunas: LugarDaPartida[][] = [Array.from({ length: primeira }, (_, i) => ({ x: xs[0], y: topo + i * passo }))];
  for (let c = 1; c < quantas; c++) {
    const ant = colunas[c - 1];
    colunas.push(Array.from({ length: ant.length / 2 }, (_, i) => ({ x: xs[c], y: (ant[2 * i].y + ant[2 * i + 1].y) / 2 })));
  }
  void altura;
  return {
    escala,
    cabecalhos: xs.map((x) => ({ x: grande ? x : x - 2, y: grande ? 159 : 100, l: grande ? 84 : 58 })),
    colunas,
  };
}
