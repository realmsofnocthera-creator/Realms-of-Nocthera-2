import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CENARIOS_DA_TORRE, FUNDOS_DA_TORRE, TORRE_UI } from '../torreUi';
import { andaresDaLista, cenarioDoAndar, fundoDaTorre } from '@/lib/torreTela';

describe('arte da Torre Celestial', () => {
  it('as imagens ficam até 350 KB', () => {
    const pasta = join(__dirname, '..', 'images', 'torre');
    for (const f of readdirSync(pasta)) expect(statSync(join(pasta, f)).size, f).toBeLessThanOrEqual(350 * 1024);
  });

  it('há 4 fundos, 6 cenários e todas as peças de interface', () => {
    expect(FUNDOS_DA_TORRE).toHaveLength(4);
    expect(CENARIOS_DA_TORRE).toHaveLength(6);
    for (const [k, v] of Object.entries(TORRE_UI)) expect(v, k).toBeTruthy();
  });

  it('o fundo muda a cada quarto dos andares e o cenário a cada 50', () => {
    expect([1, 75, 76, 150, 151, 225, 226, 300].map(fundoDaTorre)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect([1, 50, 51, 100, 101, 250, 251, 300].map(cenarioDoAndar)).toEqual([0, 0, 1, 1, 2, 4, 5, 5]);
  });

  it('a lista lateral começa no andar atual e para no 300', () => {
    const l = andaresDaLista(1, 10);
    expect(l.map((a) => a.andar)).toEqual([1, 2, 3, 4, 5]);
    expect(l[0].atual).toBe(true);
    expect(l.slice(1).every((a) => !a.atual)).toBe(true);
    expect(andaresDaLista(298, 10).map((a) => a.andar)).toEqual([298, 299, 300]);
    expect(andaresDaLista(10, 10)[0].chefe).toBe(true);
  });
});
