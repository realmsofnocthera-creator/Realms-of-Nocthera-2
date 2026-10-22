'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { textoDoPresente } from '@/rules/correio';
import type { EstadoDoCorreio } from '@/server/correio';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
const DIA_MS = 86_400_000;

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/correio', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function Botao({ children, onClick, disabled, perigo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-2 py-1 text-xs font-bold disabled:opacity-50" style={{ borderColor: perigo ? VERMELHO : OURO, backgroundColor: '#3A2F18', color: perigo ? VERMELHO : '#F5E3B3' }}>
      {children}
    </button>
  );
}

/** Correio: as mensagens com presentes (recompensas do Chefe Mundial e mensagens do Mestre). Cada uma fica 30 dias. */
export function CorreioScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoCorreio | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoCorreio);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(acao: string, id?: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, id });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setEstado(r.dados.estado as EstadoDoCorreio);
  }

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/hub" aria-label="Voltar ao Hub" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Correio</h1>
        </header>
        <p className="text-xs" style={{ color: colors.text.secondary }}>As recompensas do Chefe Mundial e as mensagens do Mestre chegam aqui. Cada mensagem fica 30 dias: resgate os presentes antes que ela suma.</p>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : estado.mensagens.length === 0 ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Nenhuma mensagem por enquanto.</p>
        ) : (
          <>
            {estado.naoResgatadas > 1 && (
              <div>
                <Botao disabled={ocupado} onClick={() => void agir('resgatarTudo')}>Resgatar tudo ({estado.naoResgatadas})</Botao>
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {estado.mensagens.map((m) => {
                const pendente = !!m.presente && !m.resgatada;
                const dias = Math.max(0, Math.ceil((Date.parse(m.expiraEm) - Date.now()) / DIA_MS));
                return (
                  <li key={m.id} className="rounded-sm border-2 p-2.5 flex flex-col gap-1" style={{ borderColor: pendente ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary }}>
                    <div className="flex justify-between gap-2">
                      <span className="font-cinzel font-bold text-sm">{m.titulo}</span>
                      <span className="text-[11px] shrink-0" style={{ color: colors.text.secondary }}>{data(m.criadaEm)}</span>
                    </div>
                    <span className="text-[11px]" style={{ color: colors.text.secondary }}>De: {m.de}{m.paraTodos ? ' · para todos' : ''} · some em {dias} {dias === 1 ? 'dia' : 'dias'}</span>
                    <p className="text-xs whitespace-pre-line">{m.texto}</p>
                    {m.presente && (
                      <ul className="text-xs flex flex-col" style={{ color: m.resgatada ? colors.text.secondary : '#F5E3B3' }}>
                        {textoDoPresente(m.presente).map((l) => <li key={l}>• {l}</li>)}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {pendente && <Botao disabled={ocupado} onClick={() => void agir('resgatar', m.id)}>Resgatar</Botao>}
                      {m.presente && m.resgatada && <span className="text-xs" style={{ color: VERDE }}>Resgatado</span>}
                      {!pendente && <Botao perigo disabled={ocupado} onClick={() => void agir('apagar', m.id)}>Apagar</Botao>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
