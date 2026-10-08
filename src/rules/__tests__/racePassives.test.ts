import { describe, it, expect } from 'vitest';
import { RACES } from '../races';

describe('racePassives', () => {
  it('cada uma das 6 raças tem passivaRacial.descricao não vazia', () => {
    expect(RACES).toHaveLength(6);
    for (const race of RACES) {
      expect(race.passivaRacial.descricao).toBeDefined();
      expect(typeof race.passivaRacial.descricao).toBe('string');
      expect(race.passivaRacial.descricao!.trim().length).toBeGreaterThan(0);
    }
  });

  it('humano: a descrição contém "5%" e o valor de passivaRacial.valor é 5', () => {
    const humano = RACES.find((r) => r.id === 'humano');
    expect(humano).toBeDefined();
    expect(humano!.passivaRacial.descricao).toContain('5%');
    expect(humano!.passivaRacial.valor).toBe(5);
  });

  it('orc: a descrição contém "30%"', () => {
    const orc = RACES.find((r) => r.id === 'orc');
    expect(orc).toBeDefined();
    expect(orc!.passivaRacial.descricao).toContain('30%');
  });
});
