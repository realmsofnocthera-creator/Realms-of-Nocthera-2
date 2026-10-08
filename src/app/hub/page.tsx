'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { CharacterDocument } from '@/server/characterService';
import { HudScreen } from '@/components/hud/HudScreen';
import { NOCTHERA_THEME } from '@/theme/theme';

interface SessionUser {
  uid: string;
  email: string | null;
}


export default function HubPage() {
  const router = useRouter();
  const { colors } = NOCTHERA_THEME;
  const [character, setCharacter] = useState<CharacterDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const buscarPersonagem = async (token: string): Promise<CharacterDocument | null> => {
      try {
        const res = await fetch('/api/character/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          return null;
        }
        const data = await res.json();
        return data.character || null;
      } catch {
        return null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        await auth.authStateReady();
      } catch {
        // Prossegue mesmo se authStateReady falhar
      }

      const activeUser = auth.currentUser ?? currentUser;

      if (activeUser) {
        try {
          const token = await activeUser.getIdToken();
          const char = await buscarPersonagem(token);
          if (cancelado) return;
          if (char) {
            setCharacter(char);
            setLoading(false);
            return;
          }
        } catch {
          // Segue para verificar fallback ou redirecionar
        }
      }


      if (!cancelado) {
        router.replace('/login');
      }
    });

    return () => {
      cancelado = true;
      unsubscribe();
    };
  }, [router]);

  if (loading || !character) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-[#120F0C]"
        style={{ color: colors.text.secondary }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: colors.accent.primary,
              borderTopColor: 'transparent',
            }}
          />
          <span
            className="text-sm font-cinzel tracking-wider"
            style={{ color: colors.text.primary }}
          >
            Consultando os Reinos...
          </span>
        </div>
      </main>
    );
  }

  return <HudScreen personagem={character} />;
}
