export type SlotHabilidade = 'ataqueBasico' | 'habilidadeEspecial' | 'ultimate';

export const SLOTS_HABILIDADE: readonly SlotHabilidade[] = [
  'ataqueBasico',
  'habilidadeEspecial',
  'ultimate',
] as const;

export type HabilidadesEquipadas = Record<SlotHabilidade, string>;
