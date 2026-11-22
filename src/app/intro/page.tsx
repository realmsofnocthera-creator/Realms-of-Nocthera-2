'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { IntroDoLobo } from '@/components/intro/IntroDoLobo';
import type { CharacterDocument } from '@/server/characterService';

/** Logo depois de criar o personagem: o vídeo e as duas lutas da introdução. Quem já viveu a introdução (ou não tem personagem) vai embora daqui. */
export default function IntroPage() {
  const router = useRouter();
  const [personagem, setPersonagem] = useState<CharacterDocument | null>(null);

  useEffect(() => {
    let cancelado = false;
    const parar = onAuthStateChanged(auth, async (usuario) => {
      try {
        await auth.authStateReady();
      } catch {
        /* segue */
      }
      const ativo = auth.currentUser ?? usuario;
      if (!ativo) return router.replace('/login');
      try {
        const token = await ativo.getIdToken();
        const res = await fetch('/api/character/me', { headers: { Authorization: `Bearer ${token}` } });
        const dados = res.ok ? ((await res.json()) as { character?: CharacterDocument | null }) : null;
        if (cancelado) return;
        const c = dados?.character ?? null;
        if (!c) return router.replace('/login');
        if (c.introConcluida || c.nivel > 1) return router.replace('/hub');
        setPersonagem(c);
      } catch {
        if (!cancelado) router.replace('/hub');
      }
    });
    return () => {
      cancelado = true;
      parar();
    };
  }, [router]);

  if (!personagem) return <main className="fixed inset-0 bg-black" aria-busy="true" />;
  return <IntroDoLobo personagem={personagem} />;
}
