import { describe, it, expect } from 'vitest';
import {
  calcularHpMax,
  calcularManaMax,
  calcularSobreescudoMax,
  calcularPoderTotal,
  xpParaProximoNivel,
  aplicarDano,
} from '../index';
import { GAME_CONFIG } from '../../rules/config';

describe('Realms of Nocthera - Regras do Jogo e Lógica Pura', () => {
  describe('Atributos e Status Iniciais', () => {
    it('personagem novo deve iniciar com 10 HP e 10 Mana com base nos atributos iniciais', () => {
      const vigorBase = GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor;
      const menteBase = GAME_CONFIG.VALOR_BASE_ATRIBUTOS.mente;

      expect(vigorBase).toBe(2);
      expect(menteBase).toBe(2);

      const hpInicial = calcularHpMax(vigorBase);
      const manaInicial = calcularManaMax(menteBase);

      expect(hpInicial).toBe(10);
      expect(manaInicial).toBe(10);
    });

    it('10 pontos extras em Vigor devem resultar em 60 HP no total', () => {
      const pontosExtras = 10;
      const vigorTotal = GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor + pontosExtras;

      expect(vigorTotal).toBe(12);

      const hpTotal = calcularHpMax(vigorTotal);
      expect(hpTotal).toBe(60);
    });

    it('cálculo de Sobreescudo máximo por ponto de Vitalidade', () => {
      const vitalidadeBase = GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade;
      expect(calcularSobreescudoMax(vitalidadeBase)).toBe(0);

      const vitalidadeComPontos = 5;
      expect(calcularSobreescudoMax(vitalidadeComPontos)).toBe(10);
    });

    it('calcularPoderTotal soma exatamente os 7 atributos finais do personagem', () => {
      const atributosFinais = {
        vigor: 7,
        mente: 5,
        forca: 6,
        vitalidade: 4,
        arcano: 2,
        inteligencia: 3,
        agilidade: 5,
      };
      expect(calcularPoderTotal(atributosFinais)).toBe(32);
    });
  });

  describe('Tabela de XP e Progressão', () => {
    it('XP do nível 1 = 20 e do nível 30 = 4200', () => {
      expect(xpParaProximoNivel(1)).toBe(20);
      expect(xpParaProximoNivel(30)).toBe(4200);
    });

    it('deve lançar erro para níveis fora da tabela', () => {
      expect(() => xpParaProximoNivel(0)).toThrow();
      expect(() => xpParaProximoNivel(31)).toThrow();
    });
  });

  describe('Sistema de Dano e Mitigação', () => {
    it('garante dano mínimo de 1 mesmo se a mitigação for maior ou igual ao dano bruto', () => {
      // Dano bruto 5, mitigação 10, sem sobreescudo, HP 100
      const resultado = aplicarDano(5, 10, 0, 100);

      // O dano mitigado seria -5, mas é limitado ao dano mínimo de 1
      expect(resultado.sobreescudo).toBe(0);
      expect(resultado.hp).toBe(99);
    });

    it('garante que o dano consome Sobreescudo antes do HP', () => {
      // Dano bruto 15, mitigação 0, sobreescudo 20, HP 50
      const resultadoAbsorvido = aplicarDano(15, 0, 20, 50);

      expect(resultadoAbsorvido.sobreescudo).toBe(5);
      expect(resultadoAbsorvido.hp).toBe(50); // HP intacto

      // Dano que excede o sobreescudo: dano bruto 25, mitigação 0, sobreescudo 20, HP 50
      const resultadoExcedente = aplicarDano(25, 0, 20, 50);

      expect(resultadoExcedente.sobreescudo).toBe(0);
      expect(resultadoExcedente.hp).toBe(45); // HP sofreu 5 de dano excedente
    });

    it('garante que a mitigação é aplicada antes do Sobreescudo', () => {
      // Dano bruto 30, mitigação 10, sobreescudo 25, HP 50
      // 1. Mitigação: 30 - 10 = 20 de dano efetivo
      // 2. Sobreescudo absorve os 20 de dano: 25 - 20 = 5 de sobreescudo restante
      // 3. HP permanece 50
      const resultado = aplicarDano(30, 10, 25, 50);

      expect(resultado.sobreescudo).toBe(5);
      expect(resultado.hp).toBe(50);
    });
  });
});
