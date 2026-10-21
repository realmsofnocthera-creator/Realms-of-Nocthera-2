import { describe, it, expect } from 'vitest';
import { chaveDeBusca, ehCriterioDeRanking, montarRanking, valorNoRanking, type ResumoDePersonagem } from '@/rules/social';

const r = (nome: string, valor: number, extra: Partial<ResumoDePersonagem> = {}): ResumoDePersonagem => ({ nome, avatarId: 'a', classeId: 'cavaleiro', racaId: 'elfo', nivel: 5, xpAtual: 0, valor, ...extra });

describe('regras do social', () => {
  it('reconhece só os quatro rankings', () => {
    expect(ehCriterioDeRanking('torre')).toBe(true);
    expect(ehCriterioDeRanking('outro')).toBe(false);
    expect(ehCriterioDeRanking(3)).toBe(false);
  });

  it('chave de busca ignora maiúsculas e espaços nas pontas', () => {
    expect(chaveDeBusca('  AraGorn ')).toBe('aragorn');
  });

  it('valor de cada ranking; quem não venceu nada não entra', () => {
    const c = { nivel: 7, torreAndar: 0, batalhaSangrentaVencidas: ['a', 'b'], guerreiroVencidas: [] as number[] };
    expect(valorNoRanking(c, 'nivel')).toBe(7);
    expect(valorNoRanking(c, 'torre')).toBeUndefined();
    expect(valorNoRanking(c, 'batalha')).toBe(2);
    expect(valorNoRanking(c, 'guerreiro')).toBeUndefined();
    expect(valorNoRanking({ nivel: 1, torreAndar: 12 }, 'torre')).toBe(12);
  });

  it('ordena do maior para o menor, tira escondidos e empata na mesma posição', () => {
    const lista = montarRanking([r('Ana', 10), r('Bia', 30), r('Caio', 30), r('Dani', 50, { escondidoNoRanking: true }), r('Edu', 5, { nivel: 9 })]);
    expect(lista.map((e) => [e.posicao, e.nome])).toEqual([[1, 'Bia'], [1, 'Caio'], [3, 'Ana'], [4, 'Edu']]);
  });

  it('desempata pelo nível e depois pelo XP, e corta no tamanho', () => {
    const lista = montarRanking([r('A', 10, { nivel: 3 }), r('B', 10, { nivel: 4 }), r('C', 10, { nivel: 4, xpAtual: 9 })], 2);
    expect(lista.map((e) => e.nome)).toEqual(['C', 'B']);
    expect(lista.map((e) => e.posicao)).toEqual([1, 2]);
  });
});
