import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '../../../rules/config';
import {
  aplicarBonusContraSobreescudo,
  reduzirDanoPercentual,
} from '../efeitos';

describe('ORDEM 45 — Helpers Puros de Efeitos de Combate', () => {
  describe('aplicarBonusContraSobreescudo', () => {
    it('caso normal: aplica bônus percentual arredondado para cima quando há sobreescudo', () => {
      // 100 + 25% = 125
      expect(aplicarBonusContraSobreescudo(100, 10, 25)).toBe(125);
      // 13 * 1.25 = 16.25 -> ceil = 17
      expect(aplicarBonusContraSobreescudo(13, 5, 25)).toBe(17);
      // 7 * 1.20 = 8.4 -> ceil = 9
      expect(aplicarBonusContraSobreescudo(7, 20, 20)).toBe(9);
    });

    it('escudo zero ou negativo: não aplica bônus e mantém dano original', () => {
      expect(aplicarBonusContraSobreescudo(100, 0, 25)).toBe(100);
      expect(aplicarBonusContraSobreescudo(55, -5, 50)).toBe(55);
    });

    it('percentual zero ou negativo: não altera o dano mesmo com escudo ativo', () => {
      expect(aplicarBonusContraSobreescudo(100, 50, 0)).toBe(100);
      expect(aplicarBonusContraSobreescudo(80, 20, -10)).toBe(80);
    });
  });

  describe('reduzirDanoPercentual', () => {
    it('caso normal: reduz o dano percentual arredondando para baixo (Math.floor)', () => {
      // 100 - 20% = 80
      expect(reduzirDanoPercentual(100, 20)).toBe(80);
      // 100 - 25% = 75
      expect(reduzirDanoPercentual(100, 25)).toBe(75);
      // 100 - 10% = 90
      expect(reduzirDanoPercentual(100, 10)).toBe(90);
      // 25 * 0.67 = 16.75 -> floor = 16
      expect(reduzirDanoPercentual(25, 33)).toBe(16);
    });

    it('percentual zero ou negativo: não reduz o dano', () => {
      expect(reduzirDanoPercentual(100, 0)).toBe(100);
      expect(reduzirDanoPercentual(50, -20)).toBe(50);
    });

    it('respeita o mínimo de dano de GAME_CONFIG.DANO_MINIMO (1)', () => {
      expect(GAME_CONFIG.DANO_MINIMO).toBe(1);
      // Dano baixo com alta redução que daria 0 -> retorna 1
      expect(reduzirDanoPercentual(2, 90)).toBe(1);
      expect(reduzirDanoPercentual(1, 50)).toBe(1);
      // 100% de redução -> retorna 1
      expect(reduzirDanoPercentual(100, 100)).toBe(1);
      // Mais de 100% de redução -> retorna 1
      expect(reduzirDanoPercentual(50, 150)).toBe(1);
      // Dano bruto menor ou igual a zero -> retorna mínimo 1
      expect(reduzirDanoPercentual(0, 0)).toBe(1);
    });
  });
});
