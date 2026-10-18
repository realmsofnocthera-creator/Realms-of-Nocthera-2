import { describe, it, expect } from 'vitest';
import { aplicarPosicaoDaAcao, chaveDaArea, chaveDoBau, DESCANSO_DA_AREA_MS, descansosComA, MAXIMO_DE_DESCANSOS, planejarLuta, planejarBau, planejarPorta, planejarPosicao, posicaoInicialDoMapa, progressoInicial, MAXIMO_DE_BAUS_GUARDADOS, type ProgressoDaCampanha } from '@/game/campanha';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';

const AGORA = '2026-10-17T12:00:00.000Z';
const mapa = (objetos: ObjetoDoMapa[], colisao: [number, number][] = []): MapaDados => {
  const m = mapaVazio(10, 8);
  m.objetos = objetos;
  for (const [x, y] of colisao) m.camadas.colisao[y * 10 + x] = 1;
  return m;
};
const prog = (parte: Partial<ProgressoDaCampanha> = {}): ProgressoDaCampanha => ({ mapaId: 'vila', x: 1, y: 1, baus: [], atualizadoEm: '', ...parte });
const bau = (id: string, x: number, y: number): ObjetoDoMapa => ({ ...objetoNovo('bau', id, x, y), item: { id: 'pelo-de-rato', qtd: 3 } });
const porta = (id: string, x: number, y: number, destino = { mapa: 'floresta', x: 2, y: 2 }): ObjetoDoMapa => ({ ...objetoNovo('porta', id, x, y), destino });

describe('Campanha: regras do progresso (5.5-3 e 5.5-8)', () => {
  it('começa no início do mapa; sem início, no primeiro tile livre', () => {
    expect(posicaoInicialDoMapa(mapa([objetoNovo('inicio', 'i', 4, 3)]))).toEqual({ x: 4, y: 3 });
    expect(posicaoInicialDoMapa(mapa([], [[0, 0], [1, 0]]))).toEqual({ x: 2, y: 0 });
    expect(progressoInicial('vila', mapa([objetoNovo('inicio', 'i', 4, 3)]), AGORA)).toEqual({ mapaId: 'vila', x: 4, y: 3, baus: [], atualizadoEm: AGORA });
  });

  describe('posição (checkpoint)', () => {
    it('aceita um tile livre ligado por caminho livre; atualiza a hora', () => {
      const r = planejarPosicao(prog(), mapa([]), { mapaId: 'vila', x: 8, y: 6 }, AGORA);
      expect(r).toMatchObject({ ok: true, progresso: { x: 8, y: 6, atualizadoEm: AGORA } });
    });

    it('recusa outro mapa, número inválido, fora do mapa, tile bloqueado e objeto sólido', () => {
      const m = mapa([objetoNovo('npc', 'n', 5, 5)], [[3, 3]]);
      expect(planejarPosicao(prog(), m, { mapaId: 'floresta', x: 2, y: 2 }, AGORA).ok).toBe(false);
      expect(planejarPosicao(prog(), m, { mapaId: 'vila', x: 1.5, y: 2 }, AGORA).ok).toBe(false);
      expect(planejarPosicao(prog(), m, { mapaId: 'vila', x: '2', y: 2 }, AGORA).ok).toBe(false);
      expect(planejarPosicao(prog(), m, { mapaId: 'vila', x: 10, y: 2 }, AGORA).ok).toBe(false);
      expect(planejarPosicao(prog(), m, { mapaId: 'vila', x: 3, y: 3 }, AGORA).ok).toBe(false);
      expect(planejarPosicao(prog(), m, { mapaId: 'vila', x: 5, y: 5 }, AGORA).ok).toBe(false);
    });

    it('recusa atravessar parede: tile livre mas sem caminho até lá', () => {
      const parede: [number, number][] = Array.from({ length: 8 }, (_, y) => [5, y]);
      const r = planejarPosicao(prog({ x: 1, y: 1 }), mapa([], parede), { mapaId: 'vila', x: 8, y: 1 }, AGORA);
      expect(r).toMatchObject({ ok: false, erro: expect.stringMatching(/caminho livre/) });
    });

    it('se a posição salva ficou presa (o mapa mudou), aceita qualquer tile livre', () => {
      const r = planejarPosicao(prog({ x: 3, y: 3 }), mapa([], [[3, 3]]), { mapaId: 'vila', x: 8, y: 6 }, AGORA);
      expect(r.ok).toBe(true);
    });
  });

  describe('baú', () => {
    it('abre perto e uma vez só; guarda a chave "mapa:objeto"', () => {
      const m = mapa([bau('bau-1', 3, 1)]);
      const r = planejarBau(prog({ x: 2, y: 1 }), m, 'bau-1', AGORA);
      expect(r).toMatchObject({ ok: true, item: { id: 'pelo-de-rato', qtd: 3 }, progresso: { baus: ['vila:bau-1'] } });
      if (!r.ok) return;
      expect(planejarBau(r.progresso, m, 'bau-1', AGORA)).toMatchObject({ ok: false, erro: expect.stringMatching(/já foi aberto/) });
      expect(chaveDoBau('vila', 'bau-1')).toBe('vila:bau-1');
    });

    it('recusa baú longe, que não existe, que não é baú, com id inválido ou sem item', () => {
      const m = mapa([bau('bau-1', 8, 6), objetoNovo('placa', 'placa-1', 2, 1), { ...objetoNovo('bau', 'vazio', 2, 2), item: undefined }]);
      expect(planejarBau(prog(), m, 'bau-1', AGORA)).toMatchObject({ ok: false, erro: expect.stringMatching(/mais perto/) });
      expect(planejarBau(prog(), m, 'nao-existe', AGORA).ok).toBe(false);
      expect(planejarBau(prog(), m, 'placa-1', AGORA).ok).toBe(false);
      expect(planejarBau(prog(), m, 42, AGORA).ok).toBe(false);
      expect(planejarBau(prog(), m, 'vazio', AGORA).ok).toBe(false);
    });

    it('o mesmo id de baú em outro mapa é outro baú', () => {
      const m = mapa([bau('bau-1', 3, 1)]);
      expect(planejarBau(prog({ baus: ['floresta:bau-1'], x: 2 }), m, 'bau-1', AGORA).ok).toBe(true);
    });

    it('recusa quando a lista de baús abertos está cheia', () => {
      const cheio = Array.from({ length: MAXIMO_DE_BAUS_GUARDADOS }, (_, i) => `x:${i}`);
      expect(planejarBau(prog({ baus: cheio, x: 2 }), mapa([bau('bau-1', 3, 1)]), 'bau-1', AGORA).ok).toBe(false);
    });
  });

  describe('porta', () => {
    it('leva ao mapa e à posição de destino, conservando os baús abertos', () => {
      const origem = mapa([porta('porta-1', 2, 1)]);
      const destino = mapa([]);
      const r = planejarPorta(prog({ baus: ['vila:bau-1'] }), origem, 'porta-1', destino, AGORA);
      expect(r).toMatchObject({ ok: true, progresso: { mapaId: 'floresta', x: 2, y: 2, baus: ['vila:bau-1'] } });
    });

    it('recusa porta longe, inexistente, destino não publicado, fora do mapa ou bloqueado', () => {
      const origem = mapa([porta('porta-1', 8, 6), porta('perto', 2, 1), porta('fora', 1, 2, { mapa: 'floresta', x: 50, y: 50 })]);
      expect(planejarPorta(prog(), origem, 'porta-1', mapa([]), AGORA)).toMatchObject({ ok: false, erro: expect.stringMatching(/mais perto/) });
      expect(planejarPorta(prog(), origem, 'sumiu', mapa([]), AGORA).ok).toBe(false);
      expect(planejarPorta(prog(), origem, 'perto', null, AGORA)).toMatchObject({ ok: false, erro: expect.stringMatching(/fechada/) });
      expect(planejarPorta(prog(), origem, 'fora', mapa([]), AGORA).ok).toBe(false);
      expect(planejarPorta(prog(), origem, 'perto', mapa([], [[2, 2]]), AGORA).ok).toBe(false);
    });
  });

  describe('posição enviada junto com a ação (uma gravação só)', () => {
    it('sem posição, a ação usa a posição já salva', () => {
      const atual = prog();
      expect(aplicarPosicaoDaAcao(atual, mapa([]), undefined, AGORA)).toEqual({ ok: true, progresso: atual });
      expect(aplicarPosicaoDaAcao(atual, mapa([]), null, AGORA)).toEqual({ ok: true, progresso: atual });
    });

    it('com posição, vale como checkpoint nas mesmas regras (livre, no mesmo mapa, com caminho)', () => {
      const m = mapa([], [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7]]);
      expect(aplicarPosicaoDaAcao(prog(), m, { mapaId: 'vila', x: 4, y: 4 }, AGORA)).toMatchObject({ ok: true, progresso: { x: 4, y: 4, atualizadoEm: AGORA } });
      expect(aplicarPosicaoDaAcao(prog(), m, { mapaId: 'vila', x: 8, y: 4 }, AGORA)).toMatchObject({ ok: false, erro: expect.stringMatching(/caminho livre/) });
      expect(aplicarPosicaoDaAcao(prog(), m, { mapaId: 'floresta', x: 4, y: 4 }, AGORA).ok).toBe(false);
      expect(aplicarPosicaoDaAcao(prog(), m, 'aqui', AGORA).ok).toBe(false);
      expect(aplicarPosicaoDaAcao(prog(), m, [1, 2], AGORA).ok).toBe(false);
    });
  });

  describe('luta numa área de monstros', () => {
    const AGORA_MS = Date.parse(AGORA);
    const area = (id = 'area-1', x = 4, y = 3): ObjetoDoMapa => ({ ...objetoNovo('cacada', id, x, y), largura: 2, altura: 2, monstroId: 'rato-da-floresta' });

    it('vale com o jogador dentro da área: vitória fica onde está, derrota volta ao ponto salvo, e a área descansa nos dois casos', () => {
      const r = planejarLuta(prog(), mapa([area()]), 'area-1', { mapaId: 'vila', x: 5, y: 4 }, AGORA, AGORA_MS);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.plano).toMatchObject({ objetoId: 'area-1', monstroId: 'rato-da-floresta', chave: 'vila:area-1', descansaAte: AGORA_MS + DESCANSO_DA_AREA_MS });
      expect(r.plano.progressoVitoria).toMatchObject({ x: 5, y: 4, descansos: { 'vila:area-1': AGORA_MS + DESCANSO_DA_AREA_MS } });
      expect(r.plano.progressoDerrota).toMatchObject({ x: 1, y: 1, descansos: { 'vila:area-1': AGORA_MS + DESCANSO_DA_AREA_MS } });
    });

    it('sem posição enviada, usa a posição salva (que precisa estar dentro da área)', () => {
      expect(planejarLuta(prog({ x: 4, y: 3 }), mapa([area()]), 'area-1', undefined, AGORA, AGORA_MS).ok).toBe(true);
      expect(planejarLuta(prog({ x: 1, y: 1 }), mapa([area()]), 'area-1', undefined, AGORA, AGORA_MS)).toMatchObject({ ok: false, erro: expect.stringMatching(/não está nessa área/) });
    });

    it('recusa fora da área, área que não existe, objeto que não é área e posição inválida', () => {
      const m = mapa([area(), bau('bau-1', 3, 1)]);
      expect(planejarLuta(prog(), m, 'area-1', { mapaId: 'vila', x: 2, y: 2 }, AGORA, AGORA_MS)).toMatchObject({ ok: false, erro: expect.stringMatching(/não está nessa área/) });
      expect(planejarLuta(prog(), m, 'nao-existe', { mapaId: 'vila', x: 4, y: 3 }, AGORA, AGORA_MS).ok).toBe(false);
      expect(planejarLuta(prog(), m, 'bau-1', { mapaId: 'vila', x: 3, y: 1 }, AGORA, AGORA_MS).ok).toBe(false);
      expect(planejarLuta(prog(), m, 42, { mapaId: 'vila', x: 4, y: 3 }, AGORA, AGORA_MS).ok).toBe(false);
      expect(planejarLuta(prog(), m, 'area-1', { mapaId: 'floresta', x: 4, y: 3 }, AGORA, AGORA_MS).ok).toBe(false);
    });

    it('área descansando recusa e diz até quando; passado o descanso, vale de novo', () => {
      const descansando = prog({ descansos: { [chaveDaArea('vila', 'area-1')]: AGORA_MS + 120_000 } });
      const r = planejarLuta(descansando, mapa([area()]), 'area-1', { mapaId: 'vila', x: 4, y: 3 }, AGORA, AGORA_MS);
      expect(r).toMatchObject({ ok: false, erro: expect.stringMatching(/calma por enquanto.*2 minutos/), descansaAte: AGORA_MS + 120_000 });
      expect(planejarLuta(descansando, mapa([area()]), 'area-1', { mapaId: 'vila', x: 4, y: 3 }, AGORA, AGORA_MS + 120_001).ok).toBe(true);
    });

    it('os descansos terminados saem da lista e o teto de áreas é respeitado', () => {
      const velhos = Object.fromEntries(Array.from({ length: MAXIMO_DE_DESCANSOS }, (_, i) => [`vila:a${i}`, AGORA_MS + 1000 + i]));
      const todos = descansosComA(prog({ descansos: { ...velhos, 'vila:acabou': AGORA_MS - 1 } }), 'vila:nova', AGORA_MS);
      expect(Object.keys(todos)).toHaveLength(MAXIMO_DE_DESCANSOS);
      expect(todos['vila:nova']).toBe(AGORA_MS + DESCANSO_DA_AREA_MS);
      expect(todos).not.toHaveProperty('vila:acabou');
    });
  });
});
