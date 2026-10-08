import { ATTRIBUTES, AttributeName, Attributes } from '../rules/attributes';

export const ZEROS_ATRIBUTOS: Attributes = {
  vigor: 0,
  mente: 0,
  forca: 0,
  vitalidade: 0,
  arcano: 0,
  inteligencia: 0,
  agilidade: 0,
};

/**
 * Valida o payload de distribuição de pontos de atributo.
 * Regras:
 * - objeto simples não nulo e não array;
 * - apenas chaves correspondentes aos 7 atributos (qualquer chave desconhecida = erro);
 * - cada valor deve ser inteiro >= 0 (negativos, decimais, strings, NaN = erro);
 * - soma dos valores deve ser > 0 e <= pontosDisponiveis.
 * Retorna um objeto Attributes completo (com 0 onde não foi informado).
 */
export function validarDistribuicao(
  pontosDisponiveis: number,
  distribuicao: unknown
): Attributes {
  if (
    typeof distribuicao !== 'object' ||
    distribuicao === null ||
    Array.isArray(distribuicao)
  ) {
    throw new Error('Distribuição inválida');
  }

  const chaves = Object.keys(distribuicao as Record<string, unknown>);
  if (chaves.length === 0) {
    throw new Error('Distribuição inválida');
  }

  const atributosValidos = new Set<string>(ATTRIBUTES);
  const resultado: Attributes = { ...ZEROS_ATRIBUTOS };
  let soma = 0;

  for (const chave of chaves) {
    if (!atributosValidos.has(chave)) {
      throw new Error('Distribuição inválida');
    }

    const valor = (distribuicao as Record<string, unknown>)[chave];
    if (
      typeof valor !== 'number' ||
      !Number.isInteger(valor) ||
      Number.isNaN(valor) ||
      valor < 0
    ) {
      throw new Error('Distribuição inválida');
    }

    resultado[chave as AttributeName] = valor;
    soma += valor;
  }

  if (soma <= 0) {
    throw new Error('Distribuição inválida');
  }

  if (soma > pontosDisponiveis) {
    throw new Error('Pontos insuficientes');
  }

  return resultado;
}

/**
 * Aplica a distribuição de pontos aos atributos atuais e ao registro de pontos alocados por nível.
 * Função pura: não altera os objetos de entrada.
 */
export function aplicarDistribuicao(
  atributos: Attributes,
  alocados: Attributes,
  distribuicao: Attributes
): {
  atributos: Attributes;
  alocados: Attributes;
  gastos: number;
} {
  const novosAtributos: Attributes = { ...atributos };
  const novosAlocados: Attributes = { ...alocados };
  let gastos = 0;

  for (const attr of ATTRIBUTES) {
    const qtd = distribuicao[attr] || 0;
    novosAtributos[attr] = (novosAtributos[attr] || 0) + qtd;
    novosAlocados[attr] = (novosAlocados[attr] || 0) + qtd;
    gastos += qtd;
  }

  return {
    atributos: novosAtributos,
    alocados: novosAlocados,
    gastos,
  };
}

/**
 * Calcula o reset dos pontos de atributo alocados por nível.
 * Subtrai apenas os pontos alocados após a criação (os 10 iniciais da criação permanecem).
 * Função pura: não altera os objetos de entrada.
 */
export function calcularReset(
  atributos: Attributes,
  alocados: Attributes,
  pontosDisponiveis: number
): {
  atributos: Attributes;
  alocados: Attributes;
  pontosDisponiveis: number;
  devolvidos: number;
} {
  let devolvidos = 0;
  for (const attr of ATTRIBUTES) {
    devolvidos += alocados[attr] || 0;
  }

  if (devolvidos === 0) {
    throw new Error('Nenhum ponto alocado para resetar');
  }

  const novosAtributos: Attributes = { ...atributos };
  const novosAlocados: Attributes = { ...ZEROS_ATRIBUTOS };

  for (const attr of ATTRIBUTES) {
    const alocado = alocados[attr] || 0;
    const atual = novosAtributos[attr] || 0;
    const final = atual - alocado;

    if (final < 0) {
      throw new Error('Estado inconsistente');
    }

    novosAtributos[attr] = final;
  }

  return {
    atributos: novosAtributos,
    alocados: novosAlocados,
    pontosDisponiveis: pontosDisponiveis + devolvidos,
    devolvidos,
  };
}
