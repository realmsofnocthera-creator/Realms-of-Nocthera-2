import { describe, expect, it } from 'vitest';
import { efeitoDaAcao, faiscasDoImpacto, filtroDoElemento, sorteioEstavel, tamanhoDoNumero, temposDoQuadro, tremeATela } from '../cacadaCoreografia';
import { acaoDoAtaque } from '../cacadaReplay';

describe('coreografia da luta', () => {
  it('o impacto cai em 40% do quadro, e a câmera lenta é bem mais longa', () => {
    for (const [r, l] of [[false, false], [true, false], [false, true]] as const) {
      const t = temposDoQuadro(r, l);
      expect(t.impacto / t.duracao).toBeCloseTo(0.4, 1);
    }
    expect(temposDoQuadro(false, true).duracao).toBeGreaterThan(temposDoQuadro(false, false).duracao * 1.5);
    expect(temposDoQuadro(true, false).duracao).toBeLessThan(temposDoQuadro(false, false).duracao);
  });
  it('o número cresce com o dano e o crítico é bem maior', () => {
    expect(tamanhoDoNumero(5, 100, false)).toBeLessThan(tamanhoDoNumero(50, 100, false));
    expect(tamanhoDoNumero(10, 100, true)).toBeGreaterThan(tamanhoDoNumero(10, 100, false) * 1.4);
    expect(tamanhoDoNumero(1, 100, false)).toBeGreaterThanOrEqual(38);
    expect(tamanhoDoNumero(999, 100, false)).toBeLessThanOrEqual(94);
    expect(tamanhoDoNumero(10, 0, false)).toBeGreaterThan(0);
  });
  it('a escolha do efeito segue o tipo de golpe e o elemento', () => {
    expect(efeitoDaAcao({})).toBe('corte');
    expect(efeitoDaAcao({ tipoGolpe: 'perfuracao' })).toBe('perfuracao');
    expect(efeitoDaAcao({ tipoGolpe: 'contusao' })).toBe('impacto');
    expect(efeitoDaAcao({ tipoGolpe: 'magico' })).toBe('magico');
    expect(efeitoDaAcao({ elemento: 'fogo' })).toBe('magico');
    expect(filtroDoElemento()).toBe('none');
    expect(filtroDoElemento('gelo')).not.toBe('none');
  });
  it('só treme a tela no crítico ou no golpe forte', () => {
    expect(tremeATela(5, 100, false)).toBe(false);
    expect(tremeATela(5, 100, true)).toBe(true);
    expect(tremeATela(15, 100, false)).toBe(true);
  });
  it('as faíscas crescem com o golpe e têm teto, e o sorteio é estável', () => {
    expect(faiscasDoImpacto(50, 100, false)).toBeGreaterThan(faiscasDoImpacto(2, 100, false));
    expect(faiscasDoImpacto(1000, 100, true)).toBeLessThanOrEqual(22);
    expect(sorteioEstavel(7)).toBe(sorteioEstavel(7));
    expect(sorteioEstavel(7)).not.toBe(sorteioEstavel(8));
  });
});

describe('acaoDoAtaque', () => {
  const base = { atacante: 'A', defensor: 'B', danoBruto: 20, danoEfetivo: 18, sobreescudoRestante: 0, hpRestante: 50, mensagem: '' };
  it('resume o golpe: dano, críticos, elemento e reação', () => {
    const a = acaoDoAtaque({ ...base, golpesCriticos: 1, elemento: 'fogo', reacaoElemental: 'fraqueza', curaHp: 4 } as never, 'jogador');
    expect(a).toMatchObject({ de: 'jogador', dano: 18, criticos: 1, elemento: 'fogo', reacao: 'fraqueza', cura: 4, bloqueado: false });
    expect(a.golpes).toEqual([18]);
  });
  it('habilidade de vários golpes lista cada um; dano zero é bloqueado; resistência vira "resistencia"', () => {
    expect(acaoDoAtaque({ ...base, golpes: [5, 6, 7] } as never, 'jogador').golpes).toEqual([5, 6, 7]);
    expect(acaoDoAtaque({ ...base, danoEfetivo: 0 } as never, 'monstro').bloqueado).toBe(true);
    expect(acaoDoAtaque({ ...base, reacaoTipoDano: 'resistência' } as never, 'monstro').reacao).toBe('resistencia');
  });
});
