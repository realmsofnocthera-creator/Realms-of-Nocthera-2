export const ATTRIBUTES = [
  'vigor',
  'sorte',
  'forca',
  'vitalidade',
  'arcano',
  'inteligencia',
  'agilidade',
] as const;

export type AttributeName = (typeof ATTRIBUTES)[number];

export type Attributes = Record<AttributeName, number>;
