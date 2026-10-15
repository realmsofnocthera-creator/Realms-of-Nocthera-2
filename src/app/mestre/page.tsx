'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { MestrePainel, type SessaoDoPainel } from '@/components/mestre/MestrePainel';
import { NOCTHERA_THEME } from '@/theme/theme';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'semLogin' }
  | { tipo: 'negado'; uid: string }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'ok'; sessao: SessaoDoPainel };

/** /mestre: só entra quem tem papel; o servidor decide (a tela apenas mostra o resultado). */
export default function MestrePage() {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  const tokenFresco = useCallback(async () => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error('Sessão expirada. Faça login novamente.');
    return usuario.getIdToken();
  }, []);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setEstado({ tipo: 'semLogin' });
        return;
      }
      try {
        const res = await fetch('/api/mestre/eu', { headers: { Authorization: `Bearer ${await usuario.getIdToken()}` } });
        const dados = await res.json().catch(() => ({}));
        if (res.ok) setEstado({ tipo: 'ok', sessao: dados as SessaoDoPainel });
        else if (res.status === 403) setEstado({ tipo: 'negado', uid: String(dados.uid ?? usuario.uid) });
        else if (res.status === 401) setEstado({ tipo: 'semLogin' });
        else setEstado({ tipo: 'erro', mensagem: String(dados.error ?? 'Não foi possível abrir o painel.') });
      } catch {
        setEstado({ tipo: 'erro', mensagem: 'Não foi possível abrir o painel.' });
      }
    });
    return cancelar;
  }, []);

  if (estado.tipo === 'ok') return <MestrePainel sessao={estado.sessao} tokenFresco={tokenFresco} />;

  return (
    <main className="min-h-dvh flex items-center justify-center px-4" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[420px] rounded-sm border-2 p-5 flex flex-col gap-2 text-center" style={{ backgroundColor: colors.background.secondary, borderColor: '#C8A656' }}>
        {estado.tipo === 'carregando' && <span className="text-sm font-cinzel tracking-wider">Abrindo o painel...</span>}
        {estado.tipo === 'semLogin' && (
          <>
            <span className="text-sm">Faça login para entrar no painel.</span>
            <Link href="/login" className="px-3 py-1.5 rounded font-cinzel font-bold text-xs" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>Ir para o login</Link>
          </>
        )}
        {estado.tipo === 'negado' && (
          <>
            <span className="text-sm font-cinzel font-bold">Acesso restrito aos Mestres</span>
            <span className="text-xs" style={{ color: colors.text.secondary }}>Se você é o Dono, coloque este identificador na variável MESTRE_DONO_UIDS do servidor:</span>
            <code className="text-[11px] break-all rounded-sm px-2 py-1" style={{ backgroundColor: colors.background.primary }}>{estado.uid}</code>
            <Link href="/hub" className="text-xs underline">Voltar ao jogo</Link>
          </>
        )}
        {estado.tipo === 'erro' && <span className="text-sm" role="alert">{estado.mensagem}</span>}
      </div>
    </main>
  );
}
