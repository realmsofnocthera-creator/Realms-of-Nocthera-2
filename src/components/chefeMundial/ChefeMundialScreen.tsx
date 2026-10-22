'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { presenteDaFaixa } from '@/rules/chefeMundial';
import { textoDoPresente } from '@/rules/correio';
import type { EstadoDoChefeMundial } from '@/server/chefeMundial';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';

async function chamar(tokenFresco: Token, post = false): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/chefe-mundial', { method: post ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token ?? ''}` } });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const numero = (n: number) => n.toLocaleString('pt-BR');

function tempoAte(iso: string, agora: number): string {
  const s = Math.max(0, Math.floor((Date.parse(iso) - agora) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <section aria-label={titulo} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}>
      <h2 className="font-cinzel font-bold text-sm">{titulo}</h2>
      {children}
    </section>
  );
}

/** Provação de Chefe Mundial: um chefe por dia; lutas ilimitadas; vale o maior dano; a recompensa chega pelo Correio. */
export function ChefeMundialScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoChefeMundial | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoChefeMundial);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function lutar() {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, true);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível lutar agora.'), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? 'Feito.'), erro: false });
    setEstado(r.dados.estado as EstadoDoChefeMundial);
  }

  const bloqueado = !!estado && estado.meuNivel < estado.nivelNecessario;

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/provacoes" aria-label="Voltar às Provações" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Chefe Mundial</h1>
          <Link href="/correio" className="ml-auto text-xs underline" style={{ color: colors.text.secondary }}>Correio</Link>
        </header>
        <p className="text-xs" style={{ color: colors.text.secondary }}>
          Um chefe novo por dia, o mesmo para todos. Lute quantas vezes quiser: vale o seu maior dano do dia. À meia-noite (Brasília) o ranking fecha e a recompensa da sua faixa chega pelo Correio.
        </p>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            {bloqueado && <p className="text-sm font-semibold" style={{ color: VERMELHO }}>O Chefe Mundial abre no nível {estado.nivelNecessario} (agora: {estado.meuNivel}).</p>}
            <Cartao titulo={`Hoje: ${estado.chefe}`}>
              <p className="text-sm">
                Seu melhor: <strong>{numero(estado.meuMelhor)}</strong> de dano{estado.minhaPosicao ? <> · posição <strong>{estado.minhaPosicao}º</strong></> : ' · ainda não lutou hoje'}
              </p>
              <p className="text-[11px]" style={{ color: colors.text.secondary }}>O ranking fecha em {tempoAte(estado.fechaEm, agora)}.</p>
              <div>
                <button type="button" disabled={ocupado || bloqueado} onClick={() => void lutar()} className="rounded-sm border-2 px-4 py-1.5 text-sm font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
                  {ocupado ? 'Lutando...' : 'Lutar'}
                </button>
              </div>
            </Cartao>

            <Cartao titulo="Ranking de hoje">
              {estado.ranking.length === 0 ? (
                <p className="text-xs" style={{ color: colors.text.secondary }}>Ninguém lutou ainda hoje.</p>
              ) : (
                <ol className="text-xs flex flex-col gap-0.5">
                  {estado.ranking.map((r, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{r.posicao}º {r.nome}</span>
                      <span>{numero(r.dano)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Cartao>

            <Cartao titulo="Recompensas (pelo Correio)">
              <ul className="text-xs flex flex-col gap-1">
                {estado.faixas.map((f) => (
                  <li key={f.nome} className="flex flex-col">
                    <span className="font-semibold" style={{ color: estado.minhaPosicao && estado.minhaPosicao >= f.de && (f.ate === null || estado.minhaPosicao <= f.ate) ? VERDE : '#F5E3B3' }}>{f.nome}</span>
                    <span style={{ color: colors.text.secondary }}>{textoDoPresente(presenteDaFaixa(f)).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </Cartao>
          </>
        )}
      </div>
    </main>
  );
}
