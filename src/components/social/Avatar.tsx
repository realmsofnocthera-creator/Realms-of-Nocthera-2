'use client';

import React from 'react';
import { getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';

/** O rosto do avatar num círculo (ranking e busca). */
export function AvatarRedondo({ avatarId, classeId, nome, tamanho = 40 }: { avatarId: string; classeId: string; nome: string; tamanho?: number }) {
  return (
    <span className="shrink-0 rounded-full overflow-hidden border" style={{ width: tamanho, height: tamanho, borderColor: '#C8A656', backgroundColor: '#16120E' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveAvatarSrc(avatarId, classeId)} alt={`Avatar de ${nome}`} style={getAvatarFaceStyle(avatarId, classeId)} className="w-full h-full select-none pointer-events-none" />
    </span>
  );
}
