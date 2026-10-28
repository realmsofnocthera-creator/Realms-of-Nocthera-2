import { describe, expect, it } from 'vitest';
import { calcularIdade, IDADE_MINIMA, lerDataDeNascimento, validarIdadeMinima } from '../idadeMinima';

const HOJE = new Date('2026-10-28T12:00:00Z');

describe('idade mínima (16 anos)', () => {
  it('lê só datas reais no formato AAAA-MM-DD', () => {
    expect(lerDataDeNascimento('2000-02-29')).toEqual({ ano: 2000, mes: 2, dia: 29 });
    expect(lerDataDeNascimento('2001-02-29')).toBeNull();
    expect(lerDataDeNascimento('2000-13-01')).toBeNull();
    expect(lerDataDeNascimento('28/10/2000')).toBeNull();
    expect(lerDataDeNascimento('')).toBeNull();
    expect(lerDataDeNascimento(20001010)).toBeNull();
  });

  it('conta a idade completa, só depois do aniversário', () => {
    const n = { ano: 2010, mes: 10, dia: 29 };
    expect(calcularIdade(n, new Date('2026-10-28T00:00:00Z'))).toBe(15);
    expect(calcularIdade(n, new Date('2026-10-29T00:00:00Z'))).toBe(16);
  });

  it('aceita quem faz 16 anos hoje e barra quem faz amanhã', () => {
    expect(IDADE_MINIMA).toBe(16);
    expect(validarIdadeMinima('2010-10-28', HOJE)).toBeNull();
    expect(validarIdadeMinima('2010-10-29', HOJE)).toMatch(/16 anos/);
  });

  it('barra data futura, absurda ou inválida', () => {
    expect(validarIdadeMinima('2030-01-01', HOJE)).toMatch(/válida/);
    expect(validarIdadeMinima('1800-01-01', HOJE)).toMatch(/válida/);
    expect(validarIdadeMinima('abc', HOJE)).toMatch(/válida/);
    expect(validarIdadeMinima(undefined, HOJE)).toMatch(/válida/);
  });

  it('aceita um adulto', () => {
    expect(validarIdadeMinima('1990-05-20', HOJE)).toBeNull();
  });
});
