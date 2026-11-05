import { describe, it, expect } from 'vitest';
import { formatarCompacto, formatarTotal } from '../numerosCompactos';

describe('formatarCompacto', () => {
  it('deixa abaixo de mil como está', () => {
    expect(formatarCompacto(0)).toBe('0');
    expect(formatarCompacto(7)).toBe('7');
    expect(formatarCompacto(999)).toBe('999');
  });

  it('usa K, M e B com uma casa decimal e sem ",0"', () => {
    expect(formatarCompacto(1000)).toBe('1K');
    expect(formatarCompacto(1400)).toBe('1,4K');
    expect(formatarCompacto(25929)).toBe('25,9K');
    expect(formatarCompacto(10271)).toBe('10,2K');
    expect(formatarCompacto(2_000_000)).toBe('2M');
    expect(formatarCompacto(1_326_274)).toBe('1,3M');
    expect(formatarCompacto(4_100_000_000)).toBe('4,1B');
  });

  it('trunca em vez de arredondar para cima', () => {
    expect(formatarCompacto(1999)).toBe('1,9K');
    expect(formatarCompacto(999_999)).toBe('999,9K');
    expect(formatarCompacto(999_999_999)).toBe('999,9M');
  });

  it('aguenta valores inválidos e negativos', () => {
    expect(formatarCompacto(NaN)).toBe('0');
    expect(formatarCompacto(-5)).toBe('0');
    expect(formatarCompacto(Infinity)).toBe('0');
  });
});

describe('formatarTotal', () => {
  it('mostra o total com ponto de milhar', () => {
    expect(formatarTotal(25929)).toBe('25.929');
    expect(formatarTotal(1_326_274)).toBe('1.326.274');
    expect(formatarTotal(12)).toBe('12');
  });
});
