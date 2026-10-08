import { AttributeName, ATTRIBUTES } from '@/rules/attributes';

export type PendingAttributes = Record<AttributeName, number>;

export const ZEROS_PENDENTE: PendingAttributes = {
  vigor: 0,
  mente: 0,
  forca: 0,
  vitalidade: 0,
  arcano: 0,
  inteligencia: 0,
  agilidade: 0,
};

/**
 * Calcula o total de pontos atualmente pendentes de distribuição.
 */
export function calcularTotalPendente(pendente: PendingAttributes): number {
  return ATTRIBUTES.reduce((soma, attr) => soma + (pendente[attr] || 0), 0);
}

/**
 * Calcula a quantidade de pontos restantes disponíveis para gastar.
 */
export function calcularPontosRestantes(
  pontosDisponiveis: number,
  pendente: PendingAttributes
): number {
  const gastos = calcularTotalPendente(pendente);
  return Math.max(0, pontosDisponiveis - gastos);
}

/**
 * Ajusta a distribuição de um atributo (+1 ou -1) respeitando:
 * - Limite de pontos disponíveis (+ só adiciona se restarem pontos);
 * - Mínimo de 0 pontos pendentes (- não decrementa abaixo de 0).
 * Função pura que retorna um novo objeto PendingAttributes.
 */
export function ajustarPontoPendente(
  pontosDisponiveis: number,
  pendente: PendingAttributes,
  atributo: AttributeName,
  delta: number
): PendingAttributes {
  const novoPendente: PendingAttributes = { ...pendente };
  const atual = novoPendente[atributo] || 0;

  if (delta > 0) {
    const restantes = calcularPontosRestantes(pontosDisponiveis, pendente);
    if (restantes >= delta) {
      novoPendente[atributo] = atual + delta;
    }
  } else if (delta < 0) {
    const novoValor = Math.max(0, atual + delta);
    novoPendente[atributo] = novoValor;
  }

  return novoPendente;
}

/**
 * Reseta todos os pontos pendentes para zero.
 */
export function limparPendente(): PendingAttributes {
  return { ...ZEROS_PENDENTE };
}
