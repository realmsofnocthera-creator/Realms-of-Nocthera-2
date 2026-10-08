export const RACE_SKILL_ICONS: Record<string, { ativa: string; passiva: string }> = {
  humano: {
    ativa: '/icons/skills/humano-ativa.png',
    passiva: '/icons/skills/humano-passiva.png',
  },
  anao: {
    ativa: '/icons/skills/anao-ativa.png',
    passiva: '/icons/skills/anao-ativa.png',
  },
  elfo: {
    ativa: '/icons/skills/elfo-ativa.png',
    passiva: '/icons/skills/elfo-passiva.png',
  },
  orc: {
    ativa: '/icons/skills/orc-ativa.png',
    passiva: '/icons/skills/orc-passiva.png',
  },
  vampiro: {
    ativa: '/icons/skills/vampiro-ativa.png',
    passiva: '/icons/skills/vampiro-passiva.png',
  },
  draconiano: {
    ativa: '/icons/skills/draconiano-ativa.png',
    passiva: '/icons/skills/draconiano-passiva.png',
  },
};

export const CLASS_SKILL_ICONS: Record<string, string[]> = {
  barbaro: [
    '/icons/skills/barbaro-1.png',
    '/icons/skills/barbaro-2.png',
    '/icons/skills/barbaro-3.png',
    '/icons/skills/barbaro-4.png',
    '/icons/skills/barbaro-5.png',
  ],
  cavaleiro: [
    '/icons/skills/cavaleiro-1.png',
    '/icons/skills/cavaleiro-2.png',
    '/icons/skills/cavaleiro-3.png',
    '/icons/skills/cavaleiro-4.png',
    '/icons/skills/cavaleiro-5.png',
  ],
  feiticeiro: [
    '/icons/skills/feiticeiro-1.png',
    '/icons/skills/feiticeiro-2.png',
    '/icons/skills/feiticeiro-3.png',
    '/icons/skills/feiticeiro-4.png',
    '/icons/skills/feiticeiro-5.png',
  ],
  bandido: [
    '/icons/skills/bandido-1.png',
    '/icons/skills/bandido-2.png',
    '/icons/skills/bandido-3.png',
    '/icons/skills/bandido-4.png',
    '/icons/skills/bandido-5.png',
  ],
  profeta: [
    '/icons/skills/profeta-1.png',
    '/icons/skills/profeta-2.png',
    '/icons/skills/profeta-3.png',
    '/icons/skills/profeta-4.png',
    '/icons/skills/profeta-5.png',
  ],
  samurai: [
    '/icons/skills/samurai-1.png',
    '/icons/skills/samurai-2.png',
    '/icons/skills/samurai-3.png',
    '/icons/skills/samurai-4.png',
    '/icons/skills/samurai-5.png',
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
