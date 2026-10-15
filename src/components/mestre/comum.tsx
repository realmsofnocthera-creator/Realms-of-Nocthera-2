import React from 'react';
import { NOCTHERA_THEME } from '@/theme/theme';

/** Peças comuns às seções do Painel do Mestre. */
export const OURO = '#C8A656';
export const VERMELHO = '#E5736B';

export function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <section className="rounded-sm border px-3 py-2.5 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}66` }}>
      <h2 className="text-[13px] font-cinzel font-bold" style={{ color: '#F5E3B3' }}>{titulo}</h2>
      {children}
    </section>
  );
}

/** Chama uma rota do painel com o token atual; devolve se deu certo e o JSON da resposta. */
export async function chamar(
  tokenFresco: () => Promise<string>,
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(url, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const dados = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, dados };
  } catch (error) {
    return { ok: false, status: 0, dados: { error: error instanceof Error ? error.message : 'Sem conexão. Tente de novo.' } };
  }
}
