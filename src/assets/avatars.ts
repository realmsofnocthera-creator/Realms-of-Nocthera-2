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
import avatarBerserkerImg from './images/subclasses/berserker-personagem.webp';
import avatarColossoImg from './images/subclasses/colosso-personagem.webp';
import avatarVanguardaImg from './images/subclasses/vanguarda-personagem.webp';
import avatarBastiaoImg from './images/subclasses/bastiao-personagem.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const AVATAR_IMAGES: Record<AvatarAssetKey, string> = {
  'avatar-barbaro': srcDaImagem(avatarBarbaroImg),
  'avatar-cavaleiro': srcDaImagem(avatarCavaleiroImg),
  'avatar-feiticeiro': srcDaImagem(avatarFeiticeiroImg),
  'avatar-bandido': srcDaImagem(avatarBandidoImg),
  'avatar-profeta': srcDaImagem(avatarProfetaImg),
  'avatar-samurai': srcDaImagem(avatarSamuraiImg),
  'avatar-berserker': srcDaImagem(avatarBerserkerImg),
  'avatar-colosso': srcDaImagem(avatarColossoImg),
  'avatar-vanguarda': srcDaImagem(avatarVanguardaImg),
  'avatar-bastiao': srcDaImagem(avatarBastiaoImg),
};

/**
 * Enquadramento individual por classe para recortar/focar a região da cabeça/rosto
 * a partir da mesma arte de corpo inteiro (480x720, a mesma da criação de personagem).
 */
export const AVATAR_FACE_FRAMING: Record<
  AvatarId,
  { objectPosition: string; transformOrigin: string; scale: number }
> = {
  barbaro: { objectPosition: '50% 0%', transformOrigin: '42% 5%', scale: 1.9 },
  bandido: { objectPosition: '50% 0%', transformOrigin: '50% 5%', scale: 1.9 },
  cavaleiro: { objectPosition: '50% 0%', transformOrigin: '50% 1%', scale: 1.9 },
  feiticeiro: { objectPosition: '50% 0%', transformOrigin: '58% 1%', scale: 1.9 },
  profeta: { objectPosition: '50% 0%', transformOrigin: '50% 1%', scale: 1.9 },
  samurai: { objectPosition: '50% 0%', transformOrigin: '50% 1%', scale: 1.9 },
  // as artes das subclasses têm outra proporção: o enquadramento mira o rosto de cada uma
  berserker: { objectPosition: '50% 0%', transformOrigin: '34% 27%', scale: 2.3 },
  colosso: { objectPosition: '50% 0%', transformOrigin: '50% 6%', scale: 1.9 },
  vanguarda: { objectPosition: '50% 0%', transformOrigin: '52% 8%', scale: 2.1 },
  bastiao: { objectPosition: '50% 0%', transformOrigin: '53% 8%', scale: 2.1 },
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
