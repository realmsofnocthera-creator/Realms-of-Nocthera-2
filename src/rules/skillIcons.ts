export const RACE_SKILL_ICONS: Record<string, { ativa: string; passiva: string }> = {
  humano: {
    ativa: '/icons/skills/humano-ativa.webp',
    passiva: '/icons/skills/humano-passiva.webp',
  },
  anao: {
    ativa: '/icons/skills/anao-ativa.webp',
    passiva: '/icons/skills/anao-ativa.webp',
  },
  elfo: {
    ativa: '/icons/skills/elfo-ativa.webp',
    passiva: '/icons/skills/elfo-passiva.webp',
  },
  orc: {
    ativa: '/icons/skills/orc-ativa.webp',
    passiva: '/icons/skills/orc-passiva.webp',
  },
  vampiro: {
    ativa: '/icons/skills/vampiro-ativa.webp',
    passiva: '/icons/skills/vampiro-passiva.webp',
  },
  draconiano: {
    ativa: '/icons/skills/draconiano-ativa.webp',
    passiva: '/icons/skills/draconiano-passiva.webp',
  },
};

export const CLASS_SKILL_ICONS: Record<string, string[]> = {
  barbaro: [
    '/icons/skills/barbaro-1.webp',
    '/icons/skills/barbaro-2.webp',
    '/icons/skills/barbaro-3.webp',
    '/icons/skills/barbaro-4.webp',
    '/icons/skills/barbaro-5.webp',
  ],
  cavaleiro: [
    '/icons/skills/cavaleiro-1.webp',
    '/icons/skills/cavaleiro-2.webp',
    '/icons/skills/cavaleiro-3.webp',
    '/icons/skills/cavaleiro-4.webp',
    '/icons/skills/cavaleiro-5.webp',
  ],
  feiticeiro: [
    '/icons/skills/feiticeiro-1.webp',
    '/icons/skills/feiticeiro-2.webp',
    '/icons/skills/feiticeiro-3.webp',
    '/icons/skills/feiticeiro-4.webp',
    '/icons/skills/feiticeiro-5.webp',
  ],
  bandido: [
    '/icons/skills/bandido-1.webp',
    '/icons/skills/bandido-2.webp',
    '/icons/skills/bandido-3.webp',
    '/icons/skills/bandido-4.webp',
    '/icons/skills/bandido-5.webp',
  ],
  profeta: [
    '/icons/skills/profeta-1.webp',
    '/icons/skills/profeta-2.webp',
    '/icons/skills/profeta-3.webp',
    '/icons/skills/profeta-4.webp',
    '/icons/skills/profeta-5.webp',
  ],
  samurai: [
    '/icons/skills/samurai-1.webp',
    '/icons/skills/samurai-2.webp',
    '/icons/skills/samurai-3.webp',
    '/icons/skills/samurai-4.webp',
    '/icons/skills/samurai-5.webp',
  ],
};

export function getRaceSkillIcon(racaId: string, tipo: 'ativa' | 'passiva'): string | null {
  if (!racaId || typeof racaId !== 'string') return null;
  const normalized = racaId.trim().toLowerCase();
  const entry = RACE_SKILL_ICONS[normalized];
  if (!entry) return null;
  return entry[tipo] ?? null;
}

export function getClassSkillIcon(classeId: string, indice: number): string | null {
  if (!classeId || typeof classeId !== 'string') return null;
  if (typeof indice !== 'number' || indice < 0 || indice > 4 || !Number.isInteger(indice)) return null;
  const normalized = classeId.trim().toLowerCase();
  const list = CLASS_SKILL_ICONS[normalized];
  if (!list || !list[indice]) return null;
  return list[indice];
}
