import { describe, expect, it } from 'vitest';
import { colunasDaChave, contagemCurta, fichasDaArena, formaDaChave, progressoDoRanque, tempoAte, tipoDoCartao } from '../arenaTela';
import type { LutaNaTela } from '@/server/campeonato';

const luta = (indice: number, vencedor: 'a' | 'b' | null = null, minha = false): LutaNaTela => ({
  indice, a: { nome: `A${indice}`, classeId: 'barbaro', pontos: 1400 }, b: { nome: `B${indice}`, classeId: 'mago', pontos: 1400 }, vencedor, temReplay: vencedor !== null, minha,
});
const rodada = (nome: string, n: number, decididas = n) => ({ nome, lutas: Array.from({ length: n }, (_, i) => luta(i, i < decididas ? 'a' : null, i === 0)) });

describe('cartões e fichas da Arena', () => {
  it('o cartão é forte, neutro ou fraco pela diferença de 5% nos pontos', () => {
    expect(tipoDoCartao(1205, 1420)).toBe('forte');
    expect(tipoDoCartao(1205, 1310)).toBe('forte');
    expect(tipoDoCartao(1205, 1205)).toBe('neutro');
    expect(tipoDoCartao(1205, 1230)).toBe('neutro');
    expect(tipoDoCartao(1205, 1090)).toBe('fraco');
    expect(tipoDoCartao(0, 0)).toBe('neutro');
  });

  it('as fichas: grátis azuis, compradas douradas, gastas vazias', () => {
    expect(fichasDaArena(3, 0)).toEqual(['cheia', 'cheia', 'cheia', 'vazia', 'vazia']);
    expect(fichasDaArena(7, 2)).toEqual(['cheia', 'cheia', 'cheia', 'cheia', 'cheia', 'ouro', 'ouro']);
    expect(fichasDaArena(6, 2)).toEqual(['cheia', 'cheia', 'cheia', 'cheia', 'cheia', 'ouro', 'vazia']);
    expect(fichasDaArena(0, 0)).toEqual(['vazia', 'vazia', 'vazia', 'vazia', 'vazia']);
  });

  it('o tempo que falta, em dias e horas, horas e minutos, ou só minutos', () => {
    const agora = new Date('2026-11-21T12:00:00Z');
    expect(tempoAte('2026-11-24T16:30:00Z', agora)).toBe('3d 04h');
    expect(tempoAte('2026-11-21T16:20:00Z', agora)).toBe('4h 20min');
    expect(tempoAte('2026-11-21T12:12:00Z', agora)).toBe('12min');
    expect(tempoAte('2026-11-20T12:00:00Z', agora)).toBe('0min');
    expect(contagemCurta('2026-11-21T12:03:42Z', agora)).toBe('03:42');
    expect(contagemCurta('2026-11-21T13:03:42Z', agora)).toBe('1:03:42');
  });

  it('o progresso até o próximo ranque', () => {
    expect(progressoDoRanque(0)).toMatchObject({ indice: 0, proximo: 100, progresso: 0 });
    expect(progressoDoRanque(1205)).toMatchObject({ indice: 5, proximo: 1350 });
    expect(progressoDoRanque(1205).progresso).toBeCloseTo((1205 - 1000) / 350);
    expect(progressoDoRanque(5000)).toEqual({ indice: 9, proximo: null, progresso: 1 });
  });
});

describe('a chave do Campeonato', () => {
  it('com 32 jogadores e a disputa nas oitavas: 4 colunas com 8, 4, 2 e 1 partidas', () => {
    const colunas = colunasDaChave([rodada('Rodada 1', 16), rodada('Oitavas de final', 8, 4)], 32);
    expect(colunas.map((c) => c.partidas.length)).toEqual([8, 4, 2, 1]);
    expect(colunas.map((c) => c.nome)).toEqual(['Oitavas', 'Quartas', 'Semi', 'Final']);
    expect(colunas[0].rodada).toBe(1);
    expect(colunas[0].partidas.filter((p) => p.luta)).toHaveLength(8);
    expect(colunas[1].partidas.every((p) => p.luta === null && p.estado === 'normal')).toBe(true);
    // a primeira partida é minha; as que já têm vencedor ficam "fim"; as sem vencedor, "vivo"
    expect(colunas[0].partidas.map((p) => p.estado)).toEqual(['eu', 'fim', 'fim', 'fim', 'vivo', 'vivo', 'vivo', 'vivo']);
  });

  it('a partir das quartas, 3 colunas (4, 2 e 1); no fim, também', () => {
    const emQuartas = colunasDaChave([rodada('R1', 16), rodada('O', 8), rodada('Q', 4, 1)], 32);
    expect(emQuartas.map((c) => c.partidas.length)).toEqual([4, 2, 1]);
    expect(emQuartas.map((c) => c.nome)).toEqual(['Quartas', 'Semi', 'Final']);
    const fim = colunasDaChave([rodada('R1', 16), rodada('O', 8), rodada('Q', 4), rodada('S', 2), rodada('F', 1)], 32);
    expect(fim.map((c) => c.partidas.length)).toEqual([4, 2, 1]);
  });

  it('antes de existir qualquer rodada, a chave inteira é de espaços vazios', () => {
    const colunas = colunasDaChave([], 40);
    expect(colunas.map((c) => c.partidas.length)).toEqual([8, 4, 2, 1]);
    expect(colunas.every((c) => c.partidas.every((p) => p.luta === null))).toBe(true);
  });

  it('o desenho: cada partida da coluna seguinte fica no meio das duas que a alimentam; nada sai da grade de 360 x 540', () => {
    for (const q of [3, 4] as const) {
      const f = formaDaChave(q);
      expect(f.colunas).toHaveLength(q);
      expect(f.colunas.map((c) => c.length)).toEqual(q === 3 ? [4, 2, 1] : [8, 4, 2, 1]);
      for (let c = 1; c < q; c++) {
        f.colunas[c].forEach((p, k) => expect(p.y).toBeCloseTo((f.colunas[c - 1][2 * k].y + f.colunas[c - 1][2 * k + 1].y) / 2));
      }
      for (const col of f.colunas) for (const p of col) {
        expect(p.x + 78 * f.escala).toBeLessThanOrEqual(360);
        expect(p.y + 59 * f.escala).toBeLessThanOrEqual(540);
      }
      expect(f.cabecalhos).toHaveLength(q);
    }
  });
});
