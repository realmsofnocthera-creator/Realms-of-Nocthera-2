/**
 * Raridades dos materiais (decididas pelo Yuri em 12/10/2026) e a chance de cada uma por vitória na Caçada.
 * O Comum é garantido; a Sorte do caçador soma na chance das outras.
 */
export type RaridadeMaterial = 'comum' | 'raro' | 'muitoRaro' | 'epico' | 'lendario';

export interface DefinicaoRaridade {
  id: RaridadeMaterial;
  nome: string;
  estrelas: number;
  chancePercentual: number;
}

export const RARIDADES_MATERIAL: readonly DefinicaoRaridade[] = [
  { id: 'comum', nome: 'Comum', estrelas: 1, chancePercentual: 100 },
  { id: 'raro', nome: 'Raro', estrelas: 2, chancePercentual: 35 },
  { id: 'muitoRaro', nome: 'Muito raro', estrelas: 3, chancePercentual: 12 },
  { id: 'epico', nome: 'Épico', estrelas: 4, chancePercentual: 4 },
  { id: 'lendario', nome: 'Lendário', estrelas: 5, chancePercentual: 1 },
];

export const RARIDADE_MAP: Readonly<Record<RaridadeMaterial, DefinicaoRaridade>> = Object.fromEntries(
  RARIDADES_MATERIAL.map((r) => [r.id, r])
) as Record<RaridadeMaterial, DefinicaoRaridade>;
