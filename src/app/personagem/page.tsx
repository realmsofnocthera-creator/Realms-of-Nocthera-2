'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutUser } from '@/lib/firebase';
import { CharacterSheet } from '@/components/CharacterSheet';
import { CharacterDocument } from '@/server/characterService';
import type { SlotHabilidade } from '@/rules/habilidadesEquipadas';

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
          // Segue para o redirecionamento
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

  /** Troca a habilidade de um espaço entre a da classe e a da subclasse. Devolve a mensagem de erro, se houver. */
  const handleEquiparHabilidade = async (slot: SlotHabilidade, habilidadeId: string): Promise<string | null> => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return 'Sessão expirada. Entre de novo.';
      const res = await fetch('/api/character/habilidades/equipar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slot, habilidadeId }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Não foi possível trocar a habilidade.';
      if (data.character) setCharacter(data.character);
      return null;
    } catch {
      return 'Erro ao trocar a habilidade.';
    }
  };

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
        onEquiparHabilidade={handleEquiparHabilidade}
        userEmail={user.email || 'Aventureiro'}
      />
    </main>
  );
}
