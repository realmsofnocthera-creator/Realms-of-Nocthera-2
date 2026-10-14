import { describe, it, expect } from 'vitest';
import {
  CHANCE_EMBLEMA_POR_DIFICULDADE,
  conferirEntradaGuerreiro,
  dificuldadeLiberadaGuerreiro,
  GUERREIRO,
  montarChefeGuerreiro,
  nivelDeReferenciaDoChefe,
  NIVEL_GUERREIRO,
  sortearEmblemas,
  tentativaDisponivel,
} from '../guerreiro';
import { CHEFES_GUERREIRO } from '@/rules/guerreiroChefes';
import { TIPO_EMBLEMA_MAP } from '@/rules/emblemasCatalogo';
import { diaDeBrasilia } from '../batalhaSangrenta';

const HOJE = new Date('2026-10-14T15:00:00Z');

describe('Provação do Guerreiro (regras)', () => {
  it('são 10 chefes, um por dificuldade, com mecânica própria e nomes únicos', () => {
    expect(CHEFES_GUERREIRO).toHaveLength(10);
    expect(CHEFES_GUERREIRO.map((c) => c.dificuldade)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(CHEFES_GUERREIRO.map((c) => c.nome)).size).toBe(10);
    expect(new Set(CHEFES_GUERREIRO.map((c) => c.mecanicaNome)).size).toBe(10);
    expect(CHEFES_GUERREIRO.map((c) => c.carta)).toEqual(['O Louco', 'O Mago', 'O Carro', 'A Força', 'A Justiça', 'A Roda da Fortuna', 'A Morte', 'O Diabo', 'A Torre', 'O Mundo']);
  });

  it('todos os 10 chefes têm a mecânica implementada', () => {
    expect(CHEFES_GUERREIRO.map((c) => c.mecanica)).toEqual([
      'caosImprevisivel', 'convergenciaArcana', 'investidaImparavel', 'furiaContida', 'balancaDoJulgamento',
      'destinoGiratorio', 'ceifadorDeAlmas', 'pactoProfano', 'colapsoEstrutural', 'cicloDaExistencia',
    ]);
  });

  it('entrada: nível 12; cada dificuldade abre ao vencer a anterior; 1 tentativa por dia por chefe', () => {
    expect(NIVEL_GUERREIRO).toBe(12);
    expect(conferirEntradaGuerreiro('x', 20, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeInvalida' });
    expect(conferirEntradaGuerreiro(0, 20, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeInvalida' });
    expect(conferirEntradaGuerreiro(11, 20, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeInvalida' });
    expect(conferirEntradaGuerreiro(1, 11, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'nivelInsuficiente' });
    expect(conferirEntradaGuerreiro(1, 12, undefined, [], HOJE)).toMatchObject({ ok: true, dificuldade: 1 });
    expect(conferirEntradaGuerreiro(2, 12, undefined, [], HOJE)).toEqual({ ok: false, motivo: 'dificuldadeBloqueada' });
    expect(conferirEntradaGuerreiro(2, 12, undefined, [1], HOJE)).toMatchObject({ ok: true, dificuldade: 2 });
    expect(conferirEntradaGuerreiro(6, 30, undefined, [1, 2, 3, 4, 5], HOJE)).toMatchObject({ ok: true, dificuldade: 6 });
    const usada = { '1': diaDeBrasilia(HOJE) };
    expect(conferirEntradaGuerreiro(1, 12, usada, [], HOJE)).toEqual({ ok: false, motivo: 'semTentativa' });
    // outro chefe ainda tem a tentativa dele, e no dia seguinte a do primeiro volta
    expect(conferirEntradaGuerreiro(2, 12, usada, [1], HOJE)).toMatchObject({ ok: true });
    expect(tentativaDisponivel(usada, 1, new Date('2026-10-15T15:00:00Z'))).toBe(true);
    expect(dificuldadeLiberadaGuerreiro(1, [])).toBe(true);
  });

  it('as chances de emblema de cada dificuldade somam 100 e só têm as raridades da lista do Yuri', () => {
    const permitidas: Record<number, string[]> = {
      1: ['comum'],
      2: ['comum', 'raro'],
      3: ['comum', 'raro'],
      4: ['comum', 'raro', 'muitoRaro'],
      5: ['raro', 'muitoRaro'],
      6: ['raro', 'muitoRaro', 'epico'],
      7: ['raro', 'muitoRaro', 'epico', 'lendario'],
      8: ['muitoRaro', 'epico', 'lendario'],
      9: ['muitoRaro', 'epico', 'lendario'],
      10: ['muitoRaro', 'epico', 'lendario', 'mitico'],
    };
    for (let d = 1; d <= 10; d++) {
      const t = CHANCE_EMBLEMA_POR_DIFICULDADE[d];
      expect(Object.values(t).reduce((s, v) => s + (v ?? 0), 0)).toBe(100);
      expect(Object.keys(t).sort()).toEqual([...permitidas[d]].sort());
    }
  });

  it('cada vitória dá 4 emblemas, dentro das raridades da dificuldade, e o tipo sai da raridade sorteada', () => {
    for (let d = 1; d <= 10; d++) {
      for (const valor of [0, 25, 50, 75, 99.9]) {
        const r = sortearEmblemas(d, () => valor);
        expect(r).toHaveLength(GUERREIRO.emblemasPorVitoria);
        for (const e of r) {
          expect((CHANCE_EMBLEMA_POR_DIFICULDADE[d][e.raridade] ?? 0)).toBeGreaterThan(0);
          expect(TIPO_EMBLEMA_MAP[e.tipoId].raridade).toBe(e.raridade);
        }
      }
    }
    expect(sortearEmblemas(1, () => 99).every((e) => e.raridade === 'comum')).toBe(true);
    // só o primeiro dos 4 sorteia 99: Mítico (5% no fim da faixa) e o tipo vem do índice 10
    const mitico = sortearEmblemas(10, (i) => (i === 0 ? 99 : 0));
    expect(mitico.map((e) => e.raridade)).toEqual(['mitico', 'muitoRaro', 'muitoRaro', 'muitoRaro']);
    expect(sortearEmblemas(10, () => 94).some((e) => e.raridade === 'mitico')).toBe(false);
    // o tipo varia pelo sorteio dentro da raridade: 0 = primeiro, 99 = último
    expect(sortearEmblemas(1, (i) => (i >= 10 ? 0 : 0))[0].tipoId).toBe('dargan');
    expect(sortearEmblemas(1, (i) => (i >= 10 ? 99 : 0))[0].tipoId).toBe('vesper');
  });

  it('com muitas rodadas as raridades aparecem perto das chances (dificuldade 7)', () => {
    let seed = 12345;
    const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return (seed / 4294967296) * 100; };
    const total: Record<string, number> = {};
    const N = 5000;
    for (let i = 0; i < N; i++) {
      for (const e of sortearEmblemas(7, () => rng())) total[e.raridade] = (total[e.raridade] ?? 0) + 1;
    }
    const amostras = N * GUERREIRO.emblemasPorVitoria;
    expect(Math.abs(((total.lendario ?? 0) / amostras) * 100 - 5)).toBeLessThan(1);
    expect(Math.abs(((total.epico ?? 0) / amostras) * 100 - 20)).toBeLessThan(1.5);
    expect(total.comum).toBeUndefined();
    expect(total.mitico).toBeUndefined();
  });

  it('o chefe sobe de nível de referência (12 a 30) e fica mais forte a cada dificuldade', () => {
    expect([1, 2, 5, 10].map(nivelDeReferenciaDoChefe)).toEqual([12, 14, 20, 30]);
    let anterior = 0;
    for (let d = 1; d <= 10; d++) {
      const m = montarChefeGuerreiro(d);
      expect(m.hp).toBeGreaterThan(anterior);
      anterior = m.hp;
      expect(m.chefe).toBe(true);
      expect(m.enfurecido).toBe(true);
      expect(m.xpConcedido).toBe(0);
      expect(m.ouroConcedido).toEqual({ min: 0, max: 0 });
    }
    // o mago bate com a Inteligência; os demais, com a Força
    expect(montarChefeGuerreiro(2).atributos.inteligencia).toBeGreaterThan(1);
    expect(montarChefeGuerreiro(1).atributos.forca).toBeGreaterThan(1);
    expect(montarChefeGuerreiro(1).atributos.inteligencia).toBe(0);
    expect(montarChefeGuerreiro(1).mecanica).toBe('caosImprevisivel');
    expect(montarChefeGuerreiro(6).mecanica).toBe('destinoGiratorio');
    expect(montarChefeGuerreiro(10).mecanica).toBe('cicloDaExistencia');
  });
});
