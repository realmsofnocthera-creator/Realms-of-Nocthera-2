import { describe, it, expect } from 'vitest';
import {
  ASCENSAO_MAXIMA,
  bonusHabilidadePorAscensao,
  bonusReforcoPercentual,
  bonusReforcoTotalDecimos,
  CUSTO_REFORCO_ESSENCIA,
  custoDoNivelReforco,
  escalarPorNivelHabilidade,
  niveisHabilidadePorAscensao,
  PASSOS_ASCENSAO,
} from '@/rules/progressaoHabilidade';

/** 2.2.1 e 2.2.2 — valores decididos pelo Yuri em 11/10/2026. */
describe('Reforço de Habilidade (2.2.2)', () => {
  it('soma +0,5% por nível no 1–10, +0,8% no 11–20 e +1,2% no 21–30, até +25%', () => {
    expect(bonusReforcoPercentual(0)).toBe(0);
    expect(bonusReforcoPercentual(1)).toBe(0.5);
    expect(bonusReforcoPercentual(10)).toBe(5);
    expect(bonusReforcoPercentual(11)).toBe(5.8);
    expect(bonusReforcoPercentual(20)).toBe(13);
    expect(bonusReforcoPercentual(30)).toBe(25);
    expect(bonusReforcoTotalDecimos(99)).toBe(250);
  });

  it('custo em essência vai de 100 (nível 1) a 10.000 (nível 30), sempre subindo', () => {
    expect(CUSTO_REFORCO_ESSENCIA).toHaveLength(30);
    expect(custoDoNivelReforco(1)).toBe(100);
    expect(custoDoNivelReforco(30)).toBe(10_000);
    expect(custoDoNivelReforco(0)).toBeNull();
    expect(custoDoNivelReforco(31)).toBeNull();
    for (let i = 1; i < CUSTO_REFORCO_ESSENCIA.length; i++) {
      expect(CUSTO_REFORCO_ESSENCIA[i]).toBeGreaterThan(CUSTO_REFORCO_ESSENCIA[i - 1]);
    }
    expect(CUSTO_REFORCO_ESSENCIA.reduce((a, b) => a + b, 0)).toBe(67_510);
  });
});

describe('Ascensão de Habilidade (2.2.1)', () => {
  it('A1 a A10 na ordem decidida: básico, especial, passiva I, passiva II, ultimate (nível 2, depois 3)', () => {
    expect(PASSOS_ASCENSAO).toHaveLength(ASCENSAO_MAXIMA);
    expect(PASSOS_ASCENSAO.map((p) => `${p.espaco}:${p.nivelHabilidade}`)).toEqual([
      'ataqueBasico:2', 'habilidadeEspecial:2', 'passivaI:2', 'passivaII:2', 'ultimate:2',
      'ataqueBasico:3', 'habilidadeEspecial:3', 'passivaI:3', 'passivaII:3', 'ultimate:3',
    ]);
  });

  it('nível de cada espaço conforme a ascensão', () => {
    expect(niveisHabilidadePorAscensao(0)).toEqual({ ataqueBasico: 1, habilidadeEspecial: 1, passivaI: 1, passivaII: 1, ultimate: 1 });
    expect(niveisHabilidadePorAscensao(3)).toEqual({ ataqueBasico: 2, habilidadeEspecial: 2, passivaI: 2, passivaII: 1, ultimate: 1 });
    expect(niveisHabilidadePorAscensao(6)).toEqual({ ataqueBasico: 3, habilidadeEspecial: 2, passivaI: 2, passivaII: 2, ultimate: 2 });
    expect(niveisHabilidadePorAscensao(10)).toEqual({ ataqueBasico: 3, habilidadeEspecial: 3, passivaI: 3, passivaII: 3, ultimate: 3 });
  });

  it('nível 2 dá +10% e nível 3 dá +20%', () => {
    expect(bonusHabilidadePorAscensao(5)).toEqual({ ataqueBasico: 10, habilidadeEspecial: 10, passivaI: 10, passivaII: 10, ultimate: 10 });
    expect(bonusHabilidadePorAscensao(10).ultimate).toBe(20);
    expect(escalarPorNivelHabilidade(10, 0)).toBe(10);
    expect(escalarPorNivelHabilidade(10, 10)).toBe(11);
    expect(escalarPorNivelHabilidade(15, 20)).toBe(18);
  });
});
