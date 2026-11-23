'use client';

import React, { useCallback, useState } from 'react';
import { VipScreen } from '@/components/vip/VipScreen';
import { usePersonagemLogado } from '@/lib/usePersonagemLogado';
import { NOCTHERA_THEME } from '@/theme/theme';

export default function VipPage() {
  const { character, loading, tokenFresco } = usePersonagemLogado();
  const [resgatados, setResgatados] = useState<string[] | null>(null);
  const resgatar = useCallback(async () => {
    try {
      const token = await tokenFresco();
      const res = await fetch('/api/vip', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ acao: 'resgatar' }) });
      const dados = (await res.json().catch(() => ({}))) as { mensagem?: string; error?: string; vipResgatados?: string[] };
      if (res.ok && dados.vipResgatados) setResgatados(dados.vipResgatados);
      return { ok: res.ok, mensagem: dados.mensagem ?? dados.error ?? (res.ok ? 'Resgatado.' : 'Não foi possível resgatar agora.') };
    } catch {
      return { ok: false, mensagem: 'Sem conexão. Tente de novo.' };
    }
  }, [tokenFresco]);
  if (loading || !character) {
    const { colors } = NOCTHERA_THEME;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <span className="text-sm font-cinzel tracking-wider" style={{ color: colors.text.primary }}>Carregando...</span>
      </main>
    );
  }
  return <VipScreen gastoCentavos={character.gastoReal} vipResgatados={resgatados ?? character.vipResgatados} aoResgatar={resgatar} />;
}
