export type AvatarId =
  | 'barbaro'
  | 'cavaleiro'
  | 'feiticeiro'
  | 'bandido'
  | 'profeta'
  | 'samurai'
  // avatares das subclasses (liberados ao desbloquear a subclasse)
  | 'berserker'
  | 'colosso';

export type AvatarAssetKey =
  | 'avatar-barbaro'
  | 'avatar-cavaleiro'
  | 'avatar-feiticeiro'
  | 'avatar-bandido'
  | 'avatar-profeta'
  | 'avatar-samurai'
  | 'avatar-berserker'
  | 'avatar-colosso';

export interface AvatarDefinition {
  id: AvatarId;
  assetKey: AvatarAssetKey;
  /** Só os avatares de subclasse têm: a subclasse que libera o retrato e o personagem. */
  subclasseId?: string;
}

export const AVATARES_DISPONIVEIS: readonly AvatarDefinition[] = [
  {
    id: 'barbaro',
    assetKey: 'avatar-barbaro',
  },
  {
    id: 'cavaleiro',
    assetKey: 'avatar-cavaleiro',
  },
  {
    id: 'feiticeiro',
    assetKey: 'avatar-feiticeiro',
  },
  {
    id: 'bandido',
    assetKey: 'avatar-bandido',
  },
  {
    id: 'profeta',
    assetKey: 'avatar-profeta',
  },
  {
    id: 'samurai',
    assetKey: 'avatar-samurai',
  },
] as const;

/** Os avatares das subclasses: o jogador ganha o retrato e o personagem ao desbloquear a subclasse (e fica com eles). */
export const AVATARES_DE_SUBCLASSE: readonly AvatarDefinition[] = [
  { id: 'berserker', assetKey: 'avatar-berserker', subclasseId: 'berserker' },
  { id: 'colosso', assetKey: 'avatar-colosso', subclasseId: 'colosso' },
] as const;

export const DEFAULT_AVATAR_ID: AvatarId = AVATARES_DISPONIVEIS[0].id;

export function getAvatarById(id?: string | null): AvatarDefinition | undefined {
  if (!id || typeof id !== 'string') return undefined;
  return AVATARES_DISPONIVEIS.find((item) => item.id === id) ?? AVATARES_DE_SUBCLASSE.find((item) => item.id === id);
}

/** As subclasses que o personagem já desbloqueou (as guardadas mais a que está ativa agora). */
export function subclassesDesbloqueadasDe(char: { subclassesDesbloqueadas?: readonly string[]; subclasseAtualId?: string | null }): string[] {
  return [...new Set([...(char.subclassesDesbloqueadas ?? []), ...(char.subclasseAtualId ? [char.subclasseAtualId] : [])])];
}

/** O avatar está liberado: os das classes sempre; os de subclasse só depois de desbloquear a subclasse. */
export function avatarLiberado(avatar: AvatarDefinition, char: { subclassesDesbloqueadas?: readonly string[]; subclasseAtualId?: string | null }): boolean {
  return !avatar.subclasseId || subclassesDesbloqueadasDe(char).includes(avatar.subclasseId);
}

/** Os avatares que o personagem pode escolher agora: os das classes e os das subclasses que desbloqueou. */
export function avataresLiberados(char: { subclassesDesbloqueadas?: readonly string[]; subclasseAtualId?: string | null }): AvatarDefinition[] {
  return [...AVATARES_DISPONIVEIS, ...AVATARES_DE_SUBCLASSE.filter((a) => avatarLiberado(a, char))];
}
