'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PREFIXO_MINIMO_DA_BUSCA } from '@/rules/social';
import { CLASSES_MAP } from '@/rules/classes';
import { NOCTHERA_THEME } from '@/theme/theme';
import { AvatarRedondo } from './Avatar';
import { PrivacidadeSocial } from './PrivacidadeSocial';

interface Resultado {
  nome: string;
  avatarId: string;
  classeId: string;
  racaId: string;
  nivel: number;
}

interface Perfil {
  nome: string;
  raca: string;
  classe: string;
  nivel: number;
  poderTotal: number;
  sobre: string;
}

/** Buscar (7.1): procura jogadores pelo começo do nome e mostra o perfil público. */
export function BuscarScreen({ tokenFresco }: { tokenFresco: () => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setPerfil(null);
    setMensagem(null);
    try {
      const token = await tokenFresco();
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(texto)}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
      const corpo = (await res.json().catch(() => ({}))) as { resultados?: Resultado[]; error?: string };
      if (!res.ok) {
        setResultados(null);
        setMensagem(corpo.error ?? 'Não foi possível buscar agora.');
        return;
      }
      setResultados(corpo.resultados ?? []);
    } catch {
      setResultados(null);
      setMensagem('Não foi possível buscar agora.');
    }
  }

  async function abrir(nome: string) {
    setMensagem(null);
    try {
      const token = await tokenFresco();
      const res = await fetch(`/api/character/public/${encodeURIComponent(nome)}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
      if (!res.ok) throw new Error('falhou');
      const corpo = (await res.json()) as { profile: Perfil };
      setPerfil(corpo.profile);
    } catch {
      setMensagem('Não foi possível abrir esse perfil.');
    }
  }

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Buscar</h1>
        </header>
        <form onSubmit={(e) => void buscar(e)} className="flex gap-2">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={24} placeholder="Começo do nome do jogador" aria-label="Nome do jogador" className="flex-1 rounded-sm border-2 px-2 py-1.5 text-sm bg-transparent" style={{ borderColor: '#C8A656' }} />
          <button type="submit" disabled={texto.trim().length < PREFIXO_MINIMO_DA_BUSCA} className="rounded-sm border-2 px-3 text-sm font-bold disabled:opacity-50" style={{ borderColor: '#C8A656', backgroundColor: '#3A2F18' }}>Buscar</button>
        </form>
        {mensagem && <p role="alert" className="text-sm" style={{ color: '#E5484D' }}>{mensagem}</p>}
        {resultados && resultados.length === 0 && <p className="text-sm" style={{ color: colors.text.secondary }}>Nenhum jogador encontrado.</p>}
        {resultados && resultados.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {resultados.map((r) => (
              <li key={r.nome}>
                <button onClick={() => void abrir(r.nome)} className="w-full text-left rounded-sm border flex items-center gap-2 px-2 py-1.5" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }}>
                  <AvatarRedondo avatarId={r.avatarId} classeId={r.classeId} nome={r.nome} />
                  <span className="flex-1 min-w-0 flex flex-col leading-tight">
                    <span className="font-bold truncate">{r.nome}</span>
                    <span className="text-[11px]" style={{ color: colors.text.secondary }}>{CLASSES_MAP[r.classeId]?.nome ?? r.classeId} · nível {r.nivel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {perfil && (
          <section aria-label="Perfil do jogador" className="rounded-sm border-2 p-3 flex flex-col gap-1" style={{ borderColor: '#C8A656', backgroundColor: colors.background.secondary }}>
            <h2 className="font-cinzel font-bold text-lg">{perfil.nome}</h2>
            <p className="text-sm">{perfil.raca} · {perfil.classe} · nível {perfil.nivel}</p>
            <p className="text-sm">Poder total: {perfil.poderTotal}</p>
            {perfil.sobre && <p className="text-sm whitespace-pre-wrap" style={{ color: colors.text.secondary }}>{perfil.sobre}</p>}
          </section>
        )}
        <PrivacidadeSocial tokenFresco={tokenFresco} campo="escondidoNaBusca" />
      </div>
    </main>
  );
}
