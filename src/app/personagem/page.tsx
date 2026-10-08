'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutUser } from '@/lib/firebase';
import { CharacterSheet } from '@/components/CharacterSheet';
import { CharacterDocument } from '@/server/characterService';

interface SessionUser {
  uid: string;
  email: string | null;
}


export default function PersonagemPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
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
        // Prossegue
      }

      const activeUser = auth.currentUser ?? currentUser;

      if (activeUser) {
        try {
          const token = await activeUser.getIdToken();
          const char = await buscarPersonagem(token);
          if (cancelado) return;
          if (char) {
            setUser({ uid: activeUser.uid, email: activeUser.email });
            setCharacter(char);
            setLoading(false);
            return;
          }
        } catch {
          // Segue para fallback ou redirecionamento
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

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login');
  };

  if (loading || !user || !character) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#120F0C_0%,_#0D0D0D_75%)] text-[#E2D6B6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ED8A0C] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-cinzel tracking-wider text-[#F5F3E0]">
            Carregando ficha do aventureiro...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] max-h-[100dvh] w-full relative overflow-hidden">
      <CharacterSheet
        character={character}
        onLogout={handleLogout}
        userEmail={user.email || 'Aventureiro'}
      />
    </main>
  );
}
