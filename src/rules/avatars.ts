export type AvatarId =
  | 'barbaro'
  | 'cavaleiro'
  | 'feiticeiro'
  | 'bandido'
  | 'profeta'
  | 'samurai';

export type AvatarAssetKey =
  | 'avatar-barbaro'
  | 'avatar-cavaleiro'
  | 'avatar-feiticeiro'
  | 'avatar-bandido'
  | 'avatar-profeta'
  | 'avatar-samurai';

export interface AvatarDefinition {
  id: AvatarId;
  assetKey: AvatarAssetKey;
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

export const DEFAULT_AVATAR_ID: AvatarId = AVATARES_DISPONIVEIS[0].id;

export function getAvatarById(id?: string | null): AvatarDefinition | undefined {
  if (!id || typeof id !== 'string') return undefined;
  return AVATARES_DISPONIVEIS.find((item) => item.id === id);
}
