import { describe, it, expect } from 'vitest';
import { MONSTROS_CACADA, MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { categoriaDeEscala, escalaDoNivel, escalarVida } from '@/rules/escalaMonstros';
import { AJUSTE_DE_DANO_POR_CLASSE, fatorDeDanoDaClasse } from '@/rules/ajusteDeClasses';

describe('Balanceamento 2.3: escala dos monstros', () => {
  it('o nível 30 fica como a tabela; o resto é suavizado entre os vizinhos (a partir do nível 14, sem o ajuste do começo)', () => {
    expect(escalaDoNivel(30, 'boss')).toEqual({ kh: 12.9, kf: 8.1 });
    // nível 20 normal: (8.2 + 2×7.7 + 6.6) / 4 (o nível 20 é de um boss, a coluna normal usa 8.2 / 7.7 / 6.6)
    expect(escalaDoNivel(20, 'normal').kh).toBeCloseTo((8.2 + 2 * 7.7 + 6.6) / 4, 5);
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
    const a = escalaDoNivel(20, 'normal').kh;
    const b = escalaDoNivel(21, 'normal').kh;
    expect(escalaDoNivel(20.5, 'normal').kh).toBeCloseTo((a + b) / 2, 5);
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
    expect(escalarVida(100, 20, 'normal')).toBeGreaterThan(500);
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

describe('Balanceamento 2.3: chefe do Teste de Equipe', () => {
  it('sobe pela escala boss do nível de referência (dificuldade 1 = nível 25), com a vida multiplicada pelo tamanho da party', async () => {
    const { montarChefeDoTeste } = await import('@/rules/testeEquipe');
    const { pontosDeReferencia, PERFIS, MULT_CHAVE } = await import('@/rules/cacada');
    const antes = Math.round(pontosDeReferencia(25) * 0.8 * PERFIS.normal.hp * MULT_CHAVE.hp * 1.5);
    const um = montarChefeDoTeste('corpo', 1, 1);
    expect(um.hp).toBe(escalarVida(antes, 25, 'boss'));
    expect(um.hp).toBeGreaterThan(antes * 10);
    expect(montarChefeDoTeste('corpo', 1, 3).hp).toBe(um.hp * 3);
  });
});
