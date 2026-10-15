'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { NOCTHERA_THEME } from '@/theme/theme';

/** O botão que leva ao Painel do Mestre. */
export function BotaoDoPainel() {
  const { colors } = NOCTHERA_THEME;
  return (
    <Link
      href="/mestre"
      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border-2 text-xs font-cinzel font-bold uppercase tracking-wider"
      style={{ backgroundColor: colors.background.secondary, borderColor: '#C8A656', color: '#E6C775' }}
    >
      <ShieldCheck className="w-4 h-4" /> Painel do Mestre
    </Link>
  );
}

/**
 * Atalho do menu: só aparece para quem tem papel no painel. A tela apenas pergunta ao servidor (/api/mestre/eu);
 * quem decide o acesso continua sendo o servidor, então esconder o botão não protege nada por si só.
 */
export function AtalhoMestre() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let ativo = true;
    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        if (ativo) setVisivel(false);
        return;
      }
      try {
        const res = await fetch('/api/mestre/eu', { headers: { Authorization: `Bearer ${await usuario.getIdToken()}` } });
        if (ativo) setVisivel(res.ok);
      } catch {
        if (ativo) setVisivel(false);
      }
    });
    return () => {
      ativo = false;
      cancelar();
    };
  }, []);

  return visivel ? <BotaoDoPainel /> : null;
}
