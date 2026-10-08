import { describe, it, expect } from 'vitest';
import {
  validarDistribuicao,
  aplicarDistribuicao,
  calcularReset,
  ZEROS_ATRIBUTOS,
} from '@/game/attributePoints';
import { Attributes } from '@/rules/attributes';

describe('attributePoints - Funções Puras', () => {
  describe('validarDistribuicao', () => {
    it('valida uma distribuição correta e preenche atributos omitidos com 0', () => {
      const dist = validarDistribuicao(6, { vigor: 2, forca: 3 });
      expect(dist).toEqual({
        vigor: 2,
        mente: 0,
        forca: 3,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
    });

    it('aceita distribuição com soma exatamente igual aos pontos disponíveis', () => {
      const dist = validarDistribuicao(3, { vigor: 1, mente: 1, agilidade: 1 });
      expect(dist.vigor).toBe(1);
      expect(dist.mente).toBe(1);
      expect(dist.agilidade).toBe(1);
    });

    it('lança "Pontos insuficientes" quando a soma excede os pontos disponíveis', () => {
      expect(() =>
        validarDistribuicao(3, { vigor: 2, forca: 2 })
      ).toThrow('Pontos insuficientes');
    });

    it('lança "Distribuição inválida" para soma 0', () => {
      expect(() =>
        validarDistribuicao(5, { vigor: 0, forca: 0 })
      ).toThrow('Distribuição inválida');
    });

    it('lança "Distribuição inválida" para valores negativos', () => {
      expect(() =>
        validarDistribuicao(5, { vigor: -1, forca: 3 })
      ).toThrow('Distribuição inválida');
    });

    it('lança "Distribuição inválida" para decimais', () => {
      expect(() =>
        validarDistribuicao(5, { vigor: 1.5, forca: 1 })
      ).toThrow('Distribuição inválida');
    });

    it('lança "Distribuição inválida" para strings ou NaN', () => {
      expect(() =>
        validarDistribuicao(5, { vigor: '2' as unknown as number })
      ).toThrow('Distribuição inválida');

      expect(() =>
        validarDistribuicao(5, { forca: NaN })
      ).toThrow('Distribuição inválida');
    });

    it('lança "Distribuição inválida" para chave desconhecida', () => {
      expect(() =>
        validarDistribuicao(5, { vigor: 2, carisma: 2 })
      ).toThrow('Distribuição inválida');
    });

    it('lança "Distribuição inválida" para objetos nulos, arrays ou não-objetos', () => {
      expect(() => validarDistribuicao(5, null)).toThrow('Distribuição inválida');
      expect(() => validarDistribuicao(5, undefined)).toThrow('Distribuição inválida');
      expect(() => validarDistribuicao(5, [1, 2, 3])).toThrow('Distribuição inválida');
      expect(() => validarDistribuicao(5, 'vigor: 3')).toThrow('Distribuição inválida');
      expect(() => validarDistribuicao(5, {})).toThrow('Distribuição inválida');
    });
  });

  describe('aplicarDistribuicao', () => {
    it('não altera os objetos de entrada e retorna novo objeto com gastos', () => {
      const baseAtributos: Attributes = {
        vigor: 5,
        mente: 2,
        forca: 4,
        vitalidade: 3,
        arcano: 1,
        inteligencia: 1,
        agilidade: 2,
      };
      const baseAlocados: Attributes = {
        vigor: 1,
        mente: 0,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };
      const distribuicao: Attributes = {
        vigor: 2,
        mente: 1,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };

      const baseAtributosOriginal = { ...baseAtributos };
      const baseAlocadosOriginal = { ...baseAlocados };
      const distribuicaoOriginal = { ...distribuicao };

      const res = aplicarDistribuicao(baseAtributos, baseAlocados, distribuicao);

      expect(baseAtributos).toEqual(baseAtributosOriginal);
      expect(baseAlocados).toEqual(baseAlocadosOriginal);
      expect(distribuicao).toEqual(distribuicaoOriginal);

      expect(res.gastos).toBe(3);
      expect(res.atributos.vigor).toBe(7);
      expect(res.atributos.mente).toBe(3);
      expect(res.alocados.vigor).toBe(3);
      expect(res.alocados.mente).toBe(1);
    });
  });

  describe('calcularReset', () => {
    it('devolve só os pontos alocados por nível, soma a pontosDisponiveis e zera alocados', () => {
      const atributos: Attributes = {
        vigor: 8, // 5 criação + 3 alocados
        mente: 4, // 2 criação + 2 alocados
        forca: 5, // 5 criação + 0 alocados
        vitalidade: 2, // 1 criação + 1 alocado
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };
      const alocados: Attributes = {
        vigor: 3,
        mente: 2,
        forca: 0,
        vitalidade: 1,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };

      const atributosOriginal = { ...atributos };
      const alocadosOriginal = { ...alocados };

      const res = calcularReset(atributos, alocados, 1);

      // Imutabilidade
      expect(atributos).toEqual(atributosOriginal);
      expect(alocados).toEqual(alocadosOriginal);

      expect(res.devolvidos).toBe(6);
      expect(res.pontosDisponiveis).toBe(7); // 1 + 6
      expect(res.alocados).toEqual(ZEROS_ATRIBUTOS);
      expect(res.atributos).toEqual({
        vigor: 5,
        mente: 2,
        forca: 5,
        vitalidade: 1,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      });
    });

    it('lança "Nenhum ponto alocado para resetar" se alocados for zerado', () => {
      const atributos: Attributes = {
        vigor: 5,
        mente: 2,
        forca: 5,
        vitalidade: 1,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };

      expect(() =>
        calcularReset(atributos, ZEROS_ATRIBUTOS, 3)
      ).toThrow('Nenhum ponto alocado para resetar');
    });

    it('lança "Estado inconsistente" se a subtração resultaria em atributo negativo', () => {
      const atributos: Attributes = {
        vigor: 2,
        mente: 0,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };
      const alocados: Attributes = {
        vigor: 5, // Mais alocado do que o atributo total atual
        mente: 0,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };

      expect(() => calcularReset(atributos, alocados, 0)).toThrow('Estado inconsistente');
    });
  });
});
