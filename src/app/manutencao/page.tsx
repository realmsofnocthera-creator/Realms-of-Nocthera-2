'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NOCTHERA_THEME } from '@/theme/theme';

/** Tela de manutenção (3.5.5.2): mostra a mensagem do painel e volta ao jogo sozinha quando ele reabre. */
export default function ManutencaoPage() {
  const { colors } = NOCTHERA_THEME;
  const router = useRouter();
  const [mensagem, setMensagem] = useState('Verificando o estado do jogo...');

  useEffect(() => {
    let cancelado = false;
    const verificar = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) return;
        const s = (await res.json()) as { manutencao?: { ativa?: boolean; mensagem?: string } };
        if (cancelado) return;
        if (s.manutencao?.ativa) setMensagem(s.manutencao.mensagem || 'O jogo está em manutenção. Volte em instantes.');
        else router.replace('/hub');
      } catch {
        // sem conexão: tenta de novo no próximo ciclo
      }
    };
    void verificar();
    const timer = setInterval(verificar, 20_000);
    return () => {
      cancelado = true;
      clearInterval(timer);
    };
  }, [router]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <h1 className="text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Em manutenção</h1>
      <p className="text-sm max-w-sm whitespace-pre-wrap" role="status">{mensagem}</p>
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>Esta tela confere a cada 20 segundos e volta ao jogo quando ele reabrir.</p>
    </main>
  );
}
