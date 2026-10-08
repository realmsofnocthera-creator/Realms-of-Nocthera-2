export const ATTRIBUTES = [
  'vigor',
  'mente',
  'forca',
  'vitalidade',
  'arcano',
  'inteligencia',
  'agilidade',
] as const;

export type AttributeName = (typeof ATTRIBUTES)[number];

export type Attributes = Record<AttributeName, number>;
