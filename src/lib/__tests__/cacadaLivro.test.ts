import { describe, expect, it } from 'vitest';
import { fitaDaEstrela, ladoNaPagina, paginasDeMonstros } from '../cacadaLivro';
import { monstrosDaEstrela } from '../cacadaTela';

describe('livro da Caçada: páginas', () => {
  it('reparte em páginas de até 3, com quantidades parecidas', () => {
    expect(paginasDeMonstros([1, 2, 3]).map((p) => p.length)).toEqual([3]);
    expect(paginasDeMonstros([1, 2, 3, 4]).map((p) => p.length)).toEqual([2, 2]);
    expect(paginasDeMonstros([1, 2, 3, 4, 5]).map((p) => p.length)).toEqual([3, 2]);
    expect(paginasDeMonstros([1, 2, 3, 4, 5, 6, 7]).map((p) => p.length)).toEqual([3, 2, 2]);
    expect(paginasDeMonstros([])).toEqual([[]]);
  });
  it('mantém a ordem e não perde ninguém', () => {
    expect(paginasDeMonstros([1, 2, 3, 4, 5]).flat()).toEqual([1, 2, 3, 4, 5]);
  });
  it('alterna esquerda e direita', () => {
    expect([0, 1, 2, 3].map(ladoNaPagina)).toEqual(['esq', 'dir', 'esq', 'dir']);
  });
  it('as fitas: 1★ a 5★ no ranque Baixo e 6★ a 9★ no Alto', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(fitaDaEstrela)).toEqual([0, 1, 2, 3, 4, 0, 1, 2, 3]);
  });
  it('cada monstro mostra fraquezas e resistências sem repetir', () => {
    for (let e = 1; e <= 9; e++) {
      for (const m of monstrosDaEstrela(e)) {
        expect(new Set(m.fraquezas).size).toBe(m.fraquezas.length);
        expect(new Set(m.resistencias).size).toBe(m.resistencias.length);
      }
    }
  });
});
