import { describe, it, expect } from 'vitest';
import {
  calcularTotalPendente,
  calcularPontosRestantes,
  ajustarPontoPendente,
  limparPendente,
  ZEROS_PENDENTE,
  PendingAttributes,
} from '../attributeState';

describe('attributeState - Funções puras de estado de distribuição', () => {
  it('calcularTotalPendente soma corretamente os pontos distribuídos', () => {
    const pendente: PendingAttributes = {
      ...ZEROS_PENDENTE,
      vigor: 2,
      forca: 3,
      mente: 1,
    };
    expect(calcularTotalPendente(pendente)).toBe(6);
  });

  it('calcularPontosRestantes subtrai os gastos dos pontos disponíveis', () => {
    const pendente: PendingAttributes = {
      ...ZEROS_PENDENTE,
      vitalidade: 2,
      arcano: 1,
    };
    expect(calcularPontosRestantes(5, pendente)).toBe(2);
    expect(calcularPontosRestantes(3, pendente)).toBe(0);
    expect(calcularPontosRestantes(2, pendente)).toBe(0); // não fica negativo
  });

  it('ajustarPontoPendente (+) respeita o limite de pontos disponíveis', () => {
    let pendente = { ...ZEROS_PENDENTE };

    // Com 3 pontos disponíveis, adiciona 3 vezes
    pendente = ajustarPontoPendente(3, pendente, 'vigor', 1);
    expect(pendente.vigor).toBe(1);

    pendente = ajustarPontoPendente(3, pendente, 'forca', 1);
    expect(pendente.forca).toBe(1);

    pendente = ajustarPontoPendente(3, pendente, 'vigor', 1);
    expect(pendente.vigor).toBe(2);

    // Tentativa de adicionar o 4º ponto quando só há 3 disponíveis
    const antesExcesso = { ...pendente };
    const depoisExcesso = ajustarPontoPendente(3, pendente, 'mente', 1);
    expect(depoisExcesso).toEqual(antesExcesso);
    expect(depoisExcesso.mente).toBe(0);
  });

  it('ajustarPontoPendente (−) não passa de 0', () => {
    let pendente: PendingAttributes = {
      ...ZEROS_PENDENTE,
      mente: 2,
    };

    pendente = ajustarPontoPendente(5, pendente, 'mente', -1);
    expect(pendente.mente).toBe(1);

    pendente = ajustarPontoPendente(5, pendente, 'mente', -1);
    expect(pendente.mente).toBe(0);

    // Tentativa de decrementar abaixo de zero
    pendente = ajustarPontoPendente(5, pendente, 'mente', -1);
    expect(pendente.mente).toBe(0);

    pendente = ajustarPontoPendente(5, pendente, 'vigor', -1);
    expect(pendente.vigor).toBe(0);
  });

  it('limparPendente zera todas as 7 posições', () => {
    const pendente: PendingAttributes = {
      vigor: 2,
      mente: 1,
      forca: 3,
      vitalidade: 1,
      arcano: 2,
      inteligencia: 1,
      agilidade: 1,
    };

    const limpo = limparPendente();
    expect(limpo).toEqual(ZEROS_PENDENTE);
    expect(calcularTotalPendente(limpo)).toBe(0);
  });

  it('funções puras não realizam mutação nos objetos de entrada', () => {
    const original: PendingAttributes = {
      ...ZEROS_PENDENTE,
      vigor: 1,
    };
    const copia = { ...original };

    ajustarPontoPendente(3, original, 'forca', 1);
    expect(original).toEqual(copia);

    ajustarPontoPendente(3, original, 'vigor', -1);
    expect(original).toEqual(copia);
  });
});
