import { describe, expect, it } from 'vitest';
import { bestiarioDoDocumento, fichaDesbloqueada, nivelDaCriatura, nivelDoBestiario, somarVitoriasNoBestiario, xpDoBestiario, XP_MAXIMO_DO_BESTIARIO } from '../bestiario';

describe('Bestiário: níveis', () => {
  it('nível 0 a 4 pelo XP', () => {
    expect([0, 1, 2, 3, 5, 6, 9, 10, 99].map(nivelDoBestiario)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it('cada nível revela mais da ficha', () => {
    expect(fichaDesbloqueada(0, 4)).toEqual({ drops: 0, resistencias: false, fraquezas: false });
    expect(fichaDesbloqueada(1, 4)).toEqual({ drops: 2, resistencias: false, fraquezas: false });
    expect(fichaDesbloqueada(1, 3)).toEqual({ drops: 2, resistencias: false, fraquezas: false });
    expect(fichaDesbloqueada(2, 4)).toEqual({ drops: 4, resistencias: false, fraquezas: false });
    expect(fichaDesbloqueada(3, 4)).toEqual({ drops: 4, resistencias: true, fraquezas: false });
    expect(fichaDesbloqueada(4, 4)).toEqual({ drops: 4, resistencias: true, fraquezas: true });
  });
});

describe('Bestiário: XP', () => {
  it('uma vitória soma 1 XP por criatura e o teto vale', () => {
    expect(somarVitoriasNoBestiario(undefined, ['a', 'b', 'a'])).toEqual({ a: 2, b: 1 });
    expect(somarVitoriasNoBestiario({ a: XP_MAXIMO_DO_BESTIARIO }, ['a'])).toEqual({ a: XP_MAXIMO_DO_BESTIARIO });
    const atual = { a: 1 };
    expect(somarVitoriasNoBestiario(atual, [])).toBe(atual);
    expect(atual).toEqual({ a: 1 });
  });
  it('quem já derrotou antes do Bestiário começa no nível 1', () => {
    expect(xpDoBestiario({ monstrosDerrotados: ['a'] }, 'a')).toBe(1);
    expect(nivelDaCriatura({ monstrosDerrotados: ['a'], bestiario: { a: 6 } }, 'a')).toBe(3);
    expect(nivelDaCriatura({}, 'a')).toBe(0);
  });
  it('lê do banco só o que é válido', () => {
    expect(bestiarioDoDocumento({ a: 3, b: 0, c: 'x', d: 99.7 })).toEqual({ a: 3, d: XP_MAXIMO_DO_BESTIARIO });
    expect(bestiarioDoDocumento([1])).toBeUndefined();
    expect(bestiarioDoDocumento(undefined)).toBeUndefined();
  });
});
