'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AvisosDoJogo } from '@/server/diario';

const SEM_AVISOS: AvisosDoJogo = { missoes: 0, checkin: false, expedicao: false, guilda: false };

/** Os pontos de aviso do jogo (baú de missões, check-in, expedição pronta e recompensa de guilda). Sem rede, sem pontos. */
export function useAvisos(): AvisosDoJogo {
  const [avisos, setAvisos] = useState<AvisosDoJogo>(SEM_AVISOS);
  useEffect(() => {
    let cancelado = false;
    const parar = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) return;
      void (async () => {
        try {
          const res = await fetch('/api/avisos', { headers: { Authorization: `Bearer ${await usuario.getIdToken()}` } });
          if (!cancelado && res.ok) setAvisos({ ...SEM_AVISOS, ...((await res.json()) as Partial<AvisosDoJogo>) });
        } catch {
          // sem os pontos, o jogo continua funcionando
        }
      })();
    });
    return () => {
      cancelado = true;
      parar();
    };
  }, []);
  return avisos;
}
