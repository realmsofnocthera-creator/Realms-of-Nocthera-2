export type Elemento =
  | 'fogo'
  | 'gelo'
  | 'relampago'
  | 'terra'
  | 'vento'
  | 'sagrado'
  | 'sombrio';

export const ELEMENTOS: readonly Elemento[] = [
  'fogo',
  'gelo',
  'relampago',
  'terra',
  'vento',
  'sagrado',
  'sombrio',
] as const;

/**
 * Mapa parcial de modificadores elementais em percentual inteiro:
 * - Valor positivo = dano extra recebido daquele elemento (fraqueza)
 * - Valor negativo = redução de dano recebido daquele elemento (resistência/imunidade)
 */
export type ModificadoresElementais = Partial<Record<Elemento, number>>;

export const MODIFICADOR_FRAQUEZA = 40;
export const MODIFICADOR_RESISTENCIA_FORTE = -40;
export const MODIFICADOR_IMUNIDADE = -90;
export const MULTIPLICADOR_ELEMENTAL_MINIMO = 0.1;

export const DRACONIANO_RESISTENCIA_LINHAGEM = 25;
export const DRACONIANO_FRAQUEZA_OPOSTA = 10;

export const MULTIPLICADOR_ELEMENTAL_NEUTRO = 1;
export const BASE_PERCENTUAL_ELEMENTAL = 100;
export const MODIFICADOR_ELEMENTAL_NEUTRO = 0;
