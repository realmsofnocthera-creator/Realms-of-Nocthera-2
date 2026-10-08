import type React from 'react';
import {
  AVATARES_DISPONIVEIS,
  AvatarAssetKey,
  AvatarId,
  getAvatarById,
} from '@/rules/avatars';
import avatarBarbaroImg from './images/avatares/avatar-barbaro.webp';
import avatarCavaleiroImg from './images/avatares/avatar-cavaleiro.webp';
import avatarFeiticeiroImg from './images/avatares/avatar-feiticeiro.webp';
import avatarBandidoImg from './images/avatares/avatar-bandido.webp';
import avatarProfetaImg from './images/avatares/avatar-profeta.webp';
import avatarSamuraiImg from './images/avatares/avatar-samurai.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const AVATAR_IMAGES: Record<AvatarAssetKey, string> = {
  'avatar-barbaro': srcDaImagem(avatarBarbaroImg),
  'avatar-cavaleiro': srcDaImagem(avatarCavaleiroImg),
  'avatar-feiticeiro': srcDaImagem(avatarFeiticeiroImg),
  'avatar-bandido': srcDaImagem(avatarBandidoImg),
  'avatar-profeta': srcDaImagem(avatarProfetaImg),
  'avatar-samurai': srcDaImagem(avatarSamuraiImg),
};

/**
 * Enquadramento individual por classe para recortar/focar a região da cabeça/rosto
 * a partir da mesma arte de corpo inteiro (533x800).
 */
export const AVATAR_FACE_FRAMING: Record<
  AvatarId,
  { objectPosition: string; transformOrigin: string; scale: number }
> = {
  barbaro: {
    objectPosition: '54% 8%',
    transformOrigin: '54% 12%',
    scale: 2.35,
  },
  bandido: {
    objectPosition: '47% 8%',
    transformOrigin: '47% 12%',
    scale: 2.35,
  },
  cavaleiro: {
    objectPosition: '58% 8%',
    transformOrigin: '58% 12%',
    scale: 2.35,
  },
  feiticeiro: {
    objectPosition: '55% 6%',
    transformOrigin: '55% 10%',
    scale: 2.25,
  },
  profeta: {
    objectPosition: '51% 8%',
    transformOrigin: '51% 12%',
    scale: 2.35,
  },
  samurai: {
    objectPosition: '50% 8%',
    transformOrigin: '50% 12%',
    scale: 2.35,
  },
};

export function resolveAvatarDefinition(
  avatarId?: string | null,
  fallbackClasseId?: string | null
) {
  return (
    getAvatarById(avatarId) ??
    getAvatarById(fallbackClasseId) ??
    AVATARES_DISPONIVEIS[0]
  );
}

export function resolveAvatarSrc(
  avatarId?: string | null,
  fallbackClasseId?: string | null
): string {
  const found = resolveAvatarDefinition(avatarId, fallbackClasseId);
  return AVATAR_IMAGES[found.assetKey];
}

export function getAvatarFaceStyle(
  avatarId?: string | null,
  fallbackClasseId?: string | null
): React.CSSProperties {
  const found = resolveAvatarDefinition(avatarId, fallbackClasseId);
  const framing = AVATAR_FACE_FRAMING[found.id];
  return {
    objectFit: 'cover',
    objectPosition: framing.objectPosition,
    transformOrigin: framing.transformOrigin,
    transform: `scale(${framing.scale})`,
  };
}
