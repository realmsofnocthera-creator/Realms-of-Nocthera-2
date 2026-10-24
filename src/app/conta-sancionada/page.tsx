'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logoutUser } from '@/lib/firebase';
import { APELACAO_MAXIMA, APELACAO_MINIMA } from '@/rules/sancoes';
import type { EstadoDaApelacao } from '@/server/apelacao';
import { NOCTHERA_THEME } from '@/theme/theme';

const SITUACAO = { pendente: 'Seu pedido está esperando resposta.', aceita: 'Seu pedido foi aceito.', recusada: 'Seu pedido foi recusado.' } as const;

/**
 * Conta suspensa ou banida (3.5.4.3): mostra o motivo e deixa pedir apelação pelo jogo, um pedido por sanção (6.5-7).
 * Se a sanção acabou (ou a apelação foi aceita), volta ao jogo.
 */
export default function ContaSancionadaPage() {
  const { colors } = NOCTHERA_THEME;
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoDaApelacao | null>(null);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const chamar = useCallback(async (init?: RequestInit) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      router.replace('/login');
      return null;
    }
    const res = await fetch('/api/apelacao', { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    const dados = (await res.json().catch(() => ({}))) as EstadoDaApelacao & { error?: string };
    if (!res.ok) {
      setErro(dados.error ?? 'Não foi possível falar com o servidor. Tente de novo.');
      return null;
    }
    return dados;
  }, [router]);

  useEffect(() => {
    const parar = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        router.replace('/login');
        return;
      }
      const dados = await chamar();
      if (!dados) return;
      if (!dados.sancao) router.replace('/hub');
      else setEstado(dados);
    });
    return () => parar();
  }, [chamar, router]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);
    setErro(null);
    const dados = await chamar({ method: 'POST', body: JSON.stringify({ texto }) });
    setOcupado(false);
    if (dados) {
      setEstado(dados);
      setTexto('');
    }
  };

  const titulo = estado?.sancao?.tipo === 'banimento' ? 'Conta banida' : 'Conta suspensa';
  const tamanho = texto.trim().length;
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4 py-8 text-center" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <h1 className="text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>{estado ? titulo : 'Conta'}</h1>
      {!estado && !erro && <p className="text-sm">Carregando…</p>}
      {estado?.sancao && <p className="text-sm max-w-md whitespace-pre-wrap">{estado.sancao.mensagem}</p>}
      {estado?.apelacao && (
        <section className="w-full max-w-md rounded-sm border px-3 py-2.5 text-left text-sm flex flex-col gap-1" style={{ backgroundColor: colors.background.secondary, borderColor: '#B8862B66' }}>
          <span className="font-semibold">{SITUACAO[estado.apelacao.situacao]}</span>
          <span className="whitespace-pre-wrap" style={{ color: colors.text.secondary }}>{estado.apelacao.texto}</span>
          {estado.apelacao.resposta && <span>Resposta: {estado.apelacao.resposta}</span>}
        </section>
      )}
      {estado?.podeApelar && (
        <form onSubmit={enviar} className="w-full max-w-md flex flex-col gap-2 text-left">
          <label className="text-xs flex flex-col gap-1">
            Pedido de apelação: explique por que a sanção deve ser revista. Você pode mandar um pedido por sanção.
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              maxLength={APELACAO_MAXIMA}
              required
              className="rounded-sm border px-2 py-1.5 text-sm"
              style={{ backgroundColor: colors.background.secondary, borderColor: '#B8862B66', color: colors.text.primary }}
            />
          </label>
          <span className="text-[11px]" style={{ color: colors.text.secondary }}>
            {tamanho} de {APELACAO_MAXIMA} caracteres (mínimo {APELACAO_MINIMA}).
          </span>
          <button type="submit" disabled={ocupado || tamanho < APELACAO_MINIMA} className="px-4 py-2 rounded font-cinzel font-bold text-sm disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            Enviar pedido
          </button>
        </form>
      )}
      {erro && <p role="alert" className="text-sm font-semibold" style={{ color: '#E06C5A' }}>{erro}</p>}
      <button
        type="button"
        onClick={async () => {
          await logoutUser();
          router.replace('/login');
        }}
        className="text-xs underline"
        style={{ color: colors.text.secondary }}
      >
        Sair da conta
      </button>
    </main>
  );
}
