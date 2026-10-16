'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { carregarCatalogoPublicado } from '@/lib/catalogoCliente';
import type { CharacterDocument } from '@/server/characterService';

/**
 * Carrega o personagem do usuário logado (e o token) para as telas; sem login ou sem personagem, vai para /login.
 * O token é renovado a cada chamada de `tokenFresco`.
 */
export function usePersonagemLogado() {
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        await auth.authStateReady();
      } catch {
        // segue
      }
      const usuario = auth.currentUser ?? currentUser;
      if (usuario) {
        try {
          const token = await usuario.getIdToken();
          const res = await fetch('/api/character/me', { headers: { Authorization: `Bearer ${token}` } });
          const data = res.ok ? await res.json() : null;
          if (cancelado) return;
          if (data?.character) {
            setCharacter(data.character);
            setLoading(false);
            // itens editados no painel: depois de aplicados, uma cópia nova do personagem redesenha as telas
            void carregarCatalogoPublicado(token).then((mudou) => {
              if (mudou && !cancelado) setCharacter((c) => (c ? { ...c } : c));
            });
            return;
          }
        } catch {
          // segue para o login
        }
      }
      if (!cancelado) router.replace('/login');
    });
    return () => {
      cancelado = true;
      unsubscribe();
    };
  }, [router]);

  const tokenFresco = async (): Promise<string | null> => {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  };

  return { character, setCharacter, loading, tokenFresco };
}
