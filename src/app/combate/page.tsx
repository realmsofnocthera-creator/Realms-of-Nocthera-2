'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { CombatArena } from '@/components/CombatArena';
import { CharacterDocument } from '@/server/characterService';

interface SessionUser {
  uid: string;
  email: string | null;
}

const LOCAL_SESSION_KEY = 'nocthera_auth_session';

export default function CombatePage() {
  const router = useRouter();
  const [idToken, setIdToken] = useState<string | null>(null);
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
            setIdToken(token);
            setCharacter(char);
            setLoading(false);
            return;
          }
        } catch {
          // Segue para fallback ou redirecionamento
        }
      }

      try {
        const rawSession = window.localStorage.getItem(LOCAL_SESSION_KEY);
        if (rawSession) {
          const parsed = JSON.parse(rawSession) as {
            user?: SessionUser;
            idToken?: string;
          };
          if (parsed.user?.uid && parsed.idToken) {
            const char = await buscarPersonagem(parsed.idToken);
            if (cancelado) return;
            if (char) {
              setIdToken(parsed.idToken);
              setCharacter(char);
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // Ignora falhas de leitura do localStorage
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

  if (loading || !idToken || !character) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#120F0C_0%,_#0D0D0D_75%)] text-[#E2D6B6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ED8A0C] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-cinzel tracking-wider text-[#F5F3E0]">
            Preparando a Arena de Combate...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_#120F0C_0%,_#0D0D0D_75%)] px-3 sm:px-6 py-8 sm:py-12 relative overflow-x-hidden">
      <div className="w-full max-w-2xl mb-2 flex items-center justify-between">
        <Link
          href="/hub"
          className="inline-flex items-center gap-2 text-xs font-cinzel uppercase tracking-widest text-[#E2D6B6] hover:text-[#ED8A0C] bg-[#1C1B18] border border-[#B2A66C]/50 hover:border-[#ED8A0C] px-3.5 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Hub
        </Link>
      </div>

      <CombatArena
        idToken={idToken}
        character={character}
        onCombatComplete={(updatedChar) => setCharacter(updatedChar)}
      />
    </main>
  );
}
