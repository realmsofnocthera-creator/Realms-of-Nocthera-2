import { describe, it, expect } from 'vitest';
import { MONSTROS_CACADA, MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { categoriaDeEscala, escalaDoNivel, escalarVida } from '@/rules/escalaMonstros';
import { AJUSTE_DE_DANO_POR_CLASSE, fatorDeDanoDaClasse } from '@/rules/ajusteDeClasses';

describe('Balanceamento 2.3: escala dos monstros', () => {
  it('os níveis 1, 2 e 30 ficam como a tabela; o resto é suavizado entre os vizinhos', () => {
    expect(escalaDoNivel(2, 'normal')).toEqual({ kh: 5.3, kf: 5.5 });
    expect(escalaDoNivel(30, 'boss')).toEqual({ kh: 12.9, kf: 8.1 });
    // nível 4 normal: (5.1 + 2×5.3 + 4.2) / 4
    expect(escalaDoNivel(4, 'normal').kh).toBeCloseTo((5.1 + 2 * 5.3 + 4.2) / 4, 5);
  });
  it('o pico bruto do boss no nível 20 (29,0) é alisado', () => {
    expect(escalaDoNivel(20, 'boss').kh).toBeLessThan(25);
  });
  it('os níveis sem monstro difícil interpolam entre o 4 e o 12', () => {
    const d4 = escalaDoNivel(4, 'dificil').kh;
    const d8 = escalaDoNivel(8, 'dificil').kh;
    const d12 = escalaDoNivel(12, 'dificil').kh;
    expect(d8).toBeGreaterThan(Math.min(d4, d12) - 1);
    expect(d8).toBeLessThan(Math.max(d4, d12) + 1);
  });
  it('nível fracionário (Torre) interpola e nível fora da faixa fica nos extremos', () => {
    const a = escalaDoNivel(10, 'normal').kh;
    const b = escalaDoNivel(11, 'normal').kh;
    expect(escalaDoNivel(10.5, 'normal').kh).toBeCloseTo((a + b) / 2, 5);
    expect(escalaDoNivel(99, 'normal')).toEqual(escalaDoNivel(30, 'normal'));
    expect(escalaDoNivel(-3, 'normal')).toEqual(escalaDoNivel(1, 'normal'));
  });
  it('categorias: blindado e lento são difíceis; monstro-chave é boss', () => {
    expect(categoriaDeEscala('blindado', false)).toBe('dificil');
    expect(categoriaDeEscala('lento', false)).toBe('dificil');
    expect(categoriaDeEscala('agil', false)).toBe('normal');
    expect(categoriaDeEscala(undefined, false)).toBe('normal');
    expect(categoriaDeEscala('blindado', true)).toBe('boss');
  });
  it('a vida dos monstros da Caçada está multiplicada (nível ≥ 2 sempre acima da conta base)', () => {
    expect(escalarVida(100, 10, 'normal')).toBeGreaterThan(300);
    expect(MONSTROS_CACADA).toHaveLength(MONSTROS_CACADA_DADOS.length);
    for (const m of MONSTROS_CACADA) expect(m.hp).toBeGreaterThan(0);
  });
});

describe('Balanceamento 2.4: ajuste de dano por classe', () => {
  it('a tabela do documento', () => {
    expect(AJUSTE_DE_DANO_POR_CLASSE).toEqual({ samurai: -23, cavaleiro: -9, feiticeiro: -5, bandido: -5, barbaro: 9, profeta: 35 });
    expect(fatorDeDanoDaClasse('Samurai')).toBe(77);
    expect(fatorDeDanoDaClasse('profeta')).toBe(135);
    expect(fatorDeDanoDaClasse(undefined)).toBe(100);
    expect(fatorDeDanoDaClasse('constructor')).toBe(100);
  });
});
