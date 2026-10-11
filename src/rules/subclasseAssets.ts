/**
 * Artes da Tela de Subclasse (2.1.5). Enquanto as artes oficiais não chegam, toda habilidade e passiva de
 * subclasse usa a imagem base. Para trocar, basta registrar o caminho em ICONES_HABILIDADE_SUBCLASSE
 * (chave = id da habilidade ou da passiva) e em BANNERS_SUBCLASSE (chave = id da subclasse).
 */
export const SUBCLASSE_ICONE_BASE = '/icons/skills/subclasses/base.webp';

export const ICONES_HABILIDADE_SUBCLASSE: Readonly<Record<string, string>> = {};

export const BANNERS_SUBCLASSE: Readonly<Record<string, string>> = {};

export function iconeDaHabilidadeSubclasse(id: string): string {
  return ICONES_HABILIDADE_SUBCLASSE[id] ?? SUBCLASSE_ICONE_BASE;
}

export function bannerDaSubclasse(subclasseId: string): string | null {
  return BANNERS_SUBCLASSE[subclasseId] ?? null;
}

/** Cor de destaque de cada classe (banner provisório, sem arte). */
export const COR_DA_CLASSE: Readonly<Record<string, string>> = {
  barbaro: '#8B1A1A',
  cavaleiro: '#A67C1E',
  samurai: '#9B2335',
  bandido: '#6E1D2A',
  profeta: '#C9A53A',
  feiticeiro: '#5E3A99',
};
