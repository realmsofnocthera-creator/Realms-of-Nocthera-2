import {
  BASE_PERCENTUAL_ELEMENTAL,
  DRACONIANO_FRAQUEZA_OPOSTA,
  DRACONIANO_RESISTENCIA_LINHAGEM,
  ELEMENTOS,
  Elemento,
  MODIFICADOR_ELEMENTAL_NEUTRO,
  MODIFICADOR_IMUNIDADE,
  MULTIPLICADOR_ELEMENTAL_MINIMO,
  MULTIPLICADOR_ELEMENTAL_NEUTRO,
  ModificadoresElementais,
} from '@/rules/elements';
import { DraconianLineage, getRaceById } from '@/rules/races';

export type ReacaoElemental = 'fraqueza' | 'resistência' | 'imune';

/**
 * Soma, elemento por elemento, os valores de todas as fontes de modificadores recebidas.
 */
export function combinarModificadores(
  ...fontes: ModificadoresElementais[]
): ModificadoresElementais {
  const resultado: ModificadoresElementais = {};

  for (const fonte of fontes) {
    if (!fonte) continue;
    for (const elemento of ELEMENTOS) {
      const valor = fonte[elemento];
      if (typeof valor === 'number') {
        resultado[elemento] = (resultado[elemento] ?? MODIFICADOR_ELEMENTAL_NEUTRO) + valor;
      }
    }
  }

  return resultado;
}

/**
 * Calcula o multiplicador de dano elemental:
 * - Se `elemento` for undefined, retorna 1.
 * - Caso contrário, retorna `1 + (modificadores[elemento] ?? 0) / 100`,
 *   nunca abaixo de MULTIPLICADOR_ELEMENTAL_MINIMO (0.1).
 */
export function calcularMultiplicadorElemental(
  elemento: Elemento | undefined,
  modificadores: ModificadoresElementais
): number {
  if (elemento === undefined) {
    return MULTIPLICADOR_ELEMENTAL_NEUTRO;
  }

  const modificadorPercentual = modificadores[elemento] ?? MODIFICADOR_ELEMENTAL_NEUTRO;
  const multiplicadorCalculado =
    (BASE_PERCENTUAL_ELEMENTAL + modificadorPercentual) / BASE_PERCENTUAL_ELEMENTAL;

  return Math.max(MULTIPLICADOR_ELEMENTAL_MINIMO, multiplicadorCalculado);
}

/**
 * Aplica o multiplicador elemental sobre o dano bruto arredondando para baixo.
 * Nota: Não aplica o dano mínimo de 1 aqui; o mínimo continua garantido por `aplicarDano`.
 */
export function aplicarMultiplicadorElemental(
  danoBruto: number,
  multiplicador: number
): number {
  return Math.floor(danoBruto * multiplicador);
}

/**
 * Retorna os modificadores elementais passivos da raça do personagem:
 * - Draconiano: resistência à linhagem escolhida (-DRACONIANO_RESISTENCIA_LINHAGEM)
 *   e fraqueza ao elemento oposto (+DRACONIANO_FRAQUEZA_OPOSTA), reutilizando `fraquezaElementoOposto` de `src/rules/races.ts`.
 * - Vampiro: lê `resistencias` ('danoTrevas') e `fraquezas` ('resistenciaDanoFogo') de `src/rules/races.ts`
 *   e converte para `{ sombrio: -15, fogo: +10 }`.
 * - Demais raças: retorna `{}`.
 */
export function obterModificadoresRaciais(
  racaId: string,
  linhagem?: string
): ModificadoresElementais {
  const raca = getRaceById(racaId);
  if (!raca) {
    return {};
  }

  if (raca.id === 'draconiano') {
    if (!linhagem || typeof linhagem !== 'string' || !raca.fraquezaElementoOposto) {
      return {};
    }
    const linhagemNormalizada = linhagem.trim().toLowerCase() as DraconianLineage;
    const elementoOposto = raca.fraquezaElementoOposto[linhagemNormalizada];
    if (!elementoOposto) {
      return {};
    }

    return {
      [linhagemNormalizada]: -DRACONIANO_RESISTENCIA_LINHAGEM,
      [elementoOposto]: DRACONIANO_FRAQUEZA_OPOSTA,
    };
  }

  if (raca.id === 'vampiro') {
    const modificadores: ModificadoresElementais = {};

    for (const res of raca.resistencias ?? []) {
      if (res.tipo === 'danoTrevas' && typeof res.valor === 'number') {
        modificadores.sombrio = -Math.abs(res.valor);
      }
    }

    for (const fraq of raca.fraquezas ?? []) {
      if (fraq.tipo === 'resistenciaDanoFogo' && typeof fraq.valor === 'number') {
        modificadores.fogo = Math.abs(fraq.valor);
      }
    }

    return modificadores;
  }

  return {};
}

/**
 * Retorna a classificação legível da reação elemental do alvo para o battle log:
 * - "imune" se o modificador do alvo for <= -90 (MODIFICADOR_IMUNIDADE)
 * - "resistência" se o modificador do alvo for negativo (entre -89 e -1)
 * - "fraqueza" se o modificador do alvo for positivo (> 0)
 * - undefined se o modificador for 0 ou se não houver elemento
 */
export function obterTextoReacaoElemental(
  elemento: Elemento | undefined,
  modificadores: ModificadoresElementais
): ReacaoElemental | undefined {
  if (elemento === undefined) {
    return undefined;
  }

  const valor = modificadores[elemento] ?? MODIFICADOR_ELEMENTAL_NEUTRO;
  if (valor <= MODIFICADOR_IMUNIDADE) {
    return 'imune';
  }
  if (valor < MODIFICADOR_ELEMENTAL_NEUTRO) {
    return 'resistência';
  }
  if (valor > MODIFICADOR_ELEMENTAL_NEUTRO) {
    return 'fraqueza';
  }
  return undefined;
}
