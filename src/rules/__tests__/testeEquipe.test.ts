import { describe, it, expect } from 'vitest';
import { CARTAS_POR_VITORIA, DIFICULDADES, raridadesDaDificuldade } from '@/rules/testeEquipe';

describe('Teste de Equipe: cartas por dificuldade (7.4)', () => {
  it('3 cartas por vitória e as chances de cada dificuldade somam 100%', () => {
    expect(CARTAS_POR_VITORIA).toBe(3);
    for (const d of DIFICULDADES) expect(raridadesDaDificuldade(d.dificuldade).reduce((s, r) => s + r.chance, 0)).toBeCloseTo(100);
  });

  it('as raridades de cada dificuldade são as do Yuri', () => {
    const nomes = (d: number) => raridadesDaDificuldade(d).map((r) => r.raridade);
    expect(nomes(1)).toEqual(['comum']);
    expect(nomes(2)).toEqual(['comum', 'raro']);
    expect(nomes(3)).toEqual(['comum', 'raro', 'muitoRaro']);
    expect(nomes(4)).toEqual(['comum', 'raro', 'muitoRaro', 'epico']);
    expect(nomes(5)).toEqual(['raro', 'muitoRaro', 'epico', 'lendario']);
    expect(nomes(6)).toEqual(['muitoRaro', 'epico', 'lendario', 'mitico']);
    expect(raridadesDaDificuldade(6)).toContainEqual({ raridade: 'mitico', chance: 5 });
  });
});
