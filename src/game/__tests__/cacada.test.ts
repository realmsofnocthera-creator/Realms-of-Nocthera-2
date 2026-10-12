import { describe, it, expect } from 'vitest';
import {
  estadoDaEstrela,
  estrelasLiberadas,
  ranqueLiberado,
  sortearDrops,
  sorteioDeDrops,
  validarEntradaCacada,
  xpDaCacada,
} from '@/game/cacada';

/** Provação da Caçada — liberação, XP com trava e drops (regras de 12/10/2026). */
describe('Liberação das estrelas', () => {
  it('1★ abre só pelo nível 2', () => {
    expect(estadoDaEstrela(1, 1, [])).toEqual({ liberada: false, motivo: 'nivelInsuficiente' });
    expect(estadoDaEstrela(1, 2, [])).toEqual({ liberada: true });
  });

  it('as seguintes pedem o nível mínimo e o monstro-chave da anterior', () => {
    expect(estadoDaEstrela(2, 5, [])).toEqual({ liberada: false, motivo: 'chaveAnteriorPendente' });
    expect(estadoDaEstrela(2, 4, [1])).toEqual({ liberada: false, motivo: 'nivelInsuficiente' });
    expect(estadoDaEstrela(2, 5, [1])).toEqual({ liberada: true });
    expect(estrelasLiberadas(12, [1, 2, 3])).toEqual([1, 2, 3, 4]);
    expect(estadoDaEstrela(10, 30, [])).toEqual({ liberada: false, motivo: 'estrelaInvalida' });
  });

  it('ranque alto: nível 20 e o monstro-chave da 5★', () => {
    expect(ranqueLiberado('baixo', 2, [])).toBe(true);
    expect(ranqueLiberado('alto', 30, [1, 2, 3, 4])).toBe(false);
    expect(ranqueLiberado('alto', 19, [1, 2, 3, 4, 5])).toBe(false);
    expect(ranqueLiberado('alto', 20, [1, 2, 3, 4, 5])).toBe(true);
  });

  it('validação da entrada no servidor', () => {
    expect(validarEntradaCacada('rato-da-floresta', 2, [])).toMatchObject({ ok: true });
    expect(validarEntradaCacada('vargheist', 30, [])).toEqual({ ok: false, motivo: 'chaveAnteriorPendente' });
    expect(validarEntradaCacada('rato-da-peste', 30, [])).toEqual({ ok: false, motivo: 'monstroInvalido' });
    expect(validarEntradaCacada(42, 30, [])).toEqual({ ok: false, motivo: 'monstroInvalido' });
  });
});

describe('XP com a trava contra farm', () => {
  it('cheio até o mínimo + 3, depois −25% por nível até zerar', () => {
    expect([2, 5, 6, 7, 8, 9, 30].map((n) => xpDaCacada(100, 2, n))).toEqual([100, 100, 75, 50, 25, 0, 0]);
  });
});

describe('Drops', () => {
  const urso = ['pele-grossa-de-urso', 'garra-de-urso', 'gordura-densa', 'coracao-de-urso-gigante'];

  it('o Comum sempre cai; os outros pela chance da raridade', () => {
    expect(sortearDrops(urso, () => 99.9)).toEqual([{ materialId: 'pele-grossa-de-urso', quantidade: 1 }]);
    expect(sortearDrops(urso, () => 0).map((d) => d.materialId)).toEqual(urso);
    // 34,9 < 35% (Raro) cai; 12% (Muito raro) e 4% (Épico) não
    expect(sortearDrops(urso, () => 34.9).map((d) => d.materialId)).toEqual(['pele-grossa-de-urso', 'garra-de-urso']);
  });

  it('a Sorte soma na chance (em pontos)', () => {
    expect(sortearDrops(urso, () => 36).length).toBe(1);
    expect(sortearDrops(urso, () => 36, 2).length).toBe(2);
  });

  it('o sorteio sai da semente: mesma semente, mesmos drops; a frequência bate com as chances', () => {
    expect(sortearDrops(urso, sorteioDeDrops(123))).toEqual(sortearDrops(urso, sorteioDeDrops(123)));
    let raros = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      if (sortearDrops(urso, sorteioDeDrops(seed)).some((d) => d.materialId === 'garra-de-urso')) raros++;
    }
    expect(raros / 4000).toBeGreaterThan(0.31);
    expect(raros / 4000).toBeLessThan(0.39);
  });
});
