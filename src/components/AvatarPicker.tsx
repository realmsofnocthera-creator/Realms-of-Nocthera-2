'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { AVATARES_DISPONIVEIS, DEFAULT_AVATAR_ID } from '@/rules/avatars';
import { getClassById } from '@/rules/classes';
import { AVATAR_IMAGES } from '@/assets/avatars';
import { NOCTHERA_THEME } from '@/theme/theme';

const LOCAL_SESSION_KEY = 'nocthera_auth_session';

export interface AvatarPickerProps {
  selectedAvatarId?: string;
  idToken?: string;
  onSelect?: (avatarId: string) => void;
}

async function resolveCurrentToken(explicitToken?: string): Promise<string | null> {
  if (explicitToken) return explicitToken;

  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      // Continua para fallback local
    }
  }

  try {
    const rawSession = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as { idToken?: string };
      if (parsed.idToken) {
        return parsed.idToken;
      }
    }
  } catch {
    // Ignora falhas de leitura do localStorage
  }

  return null;
}

export function AvatarPicker({
  selectedAvatarId,
  idToken,
  onSelect,
}: AvatarPickerProps) {
  const { colors } = NOCTHERA_THEME;
  const [currentId, setCurrentId] = useState<string>(
    selectedAvatarId || DEFAULT_AVATAR_ID
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeAvatarId = selectedAvatarId || currentId || DEFAULT_AVATAR_ID;

  const handleChooseAvatar = async (avatarId: string) => {
    if (saving || avatarId === activeAvatarId) return;

    setSaving(true);
    setError(null);

    try {
      const token = await resolveCurrentToken(idToken);
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const res = await fetch('/api/character/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarId }),
      });

      let data: { error?: string; avatarId?: string } | null = null;
      const text = await res.text();
      if (text && text.trim().length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          // Resposta não é JSON
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || `Falha ao atualizar avatar (código ${res.status}).`);
      }

      setCurrentId(avatarId);
      onSelect?.(avatarId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar avatar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div
        role="radiogroup"
        aria-label="Selecionar Avatar"
        className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3"
      >
        {AVATARES_DISPONIVEIS.map((avatar) => {
          const isSelected = avatar.id === activeAvatarId;
          const imgSrc = AVATAR_IMAGES[avatar.assetKey];
          const classeNome = getClassById(avatar.id)?.nome || avatar.id;

          return (
            <button
              key={avatar.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Avatar ${classeNome}`}
              disabled={saving}
              onClick={() => handleChooseAvatar(avatar.id)}
              className="group relative flex flex-col items-center justify-between rounded-lg border-2 p-2 transition-all cursor-pointer disabled:opacity-60 overflow-hidden"
              style={{
                backgroundColor: isSelected
                  ? colors.background.card
                  : colors.background.primary,
                borderColor: isSelected
                  ? colors.accent.primary
                  : `${colors.border.default}66`,
                boxShadow: isSelected
                  ? '0 0 16px rgba(237, 138, 12, 0.28)'
                  : 'none',
              }}
            >
              <div className="relative w-full aspect-[2/3] flex items-end justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={classeNome}
                  className="w-full h-full object-contain object-bottom select-none pointer-events-none transition-transform duration-200 group-hover:scale-105"
                />
              </div>

              <span
                className="mt-1.5 text-[10px] sm:text-xs font-cinzel font-semibold tracking-wide truncate w-full text-center"
                style={{
                  color: isSelected ? colors.accent.primary : colors.text.secondary,
                }}
              >
                {classeNome}
              </span>

              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: colors.background.primary,
                  }}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
