'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Gift } from 'lucide-react';
import type { ResultadoCombatePvp } from '@/game/combat';
import { TITULO_MAP } from '@/rules/titulos';
import type { LadoNaTela } from '@/server/arena';
import type { EstadoDoCampeonato, LutaNaTela } from '@/server/campeonato';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
type Aviso = { texto: string; erro: boolean } | null;
type Replay = { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; titulo: string };
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
/** Com a edição em andamento, a chave atualiza a cada 30 segundos (só com a aba visível). */
const ATUALIZAR_MS = 30_000;
const NOME_DO_SELO: Readonly<Record<string, string>> = { encantado: 'Encantado', eternidade: 'Eternidade', origem: 'Origem' };

async function chamar(tokenFresco: Token, url: string, corpo?: Record<string, unknown>): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(url, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const quando = (iso: string, comDia = true) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', ...(comDia ? { weekday: 'long', day: '2-digit', month: '2-digit' } : {}), hour: '2-digit', minute: '2-digit' });
const dataBr = (dia: string) => dia.split('-').reverse().join('/');

function Luta({ l, assistir, ocupado }: { l: LutaNaTela; assistir: () => void; ocupado: boolean }) {
  const { colors } = NOCTHERA_THEME;
  const nome = (lado: 'a' | 'b') => {
    const p = l[lado];
    if (!p) return <span style={{ color: colors.text.secondary }}>passou direto</span>;
    const venceu = l.vencedor === lado;
    return (
      <span style={{ color: venceu ? '#F5E3B3' : l.vencedor ? colors.text.secondary : undefined, fontWeight: venceu ? 700 : 400 }}>
        {p.nome}
        {l.vidaA !== undefined && <span style={{ color: colors.text.secondary }}> ({lado === 'a' ? l.vidaA : l.vidaB}%)</span>}
      </span>
    );
  };
  return (
    <li className="flex items-center justify-between gap-2 text-xs rounded-sm px-2 py-1" style={{ backgroundColor: l.minha ? '#2A2114' : undefined, border: l.minha ? `1px solid ${OURO}66` : undefined }}>
      <span className="min-w-0 truncate">
        {nome('a')} <span style={{ color: OURO }}>×</span> {nome('b')}
      </span>
      {l.temReplay && (
        <button type="button" onClick={assistir} disabled={ocupado} className="shrink-0 underline disabled:opacity-50" style={{ color: OURO }}>
          Assistir
        </button>
      )}
    </li>
  );
}

/**
 * Aba Campeonato (7.5): a próxima edição e quem entra, a chave da edição de hoje (ou da última) com o replay de cada
 * luta, os prêmios por colocação, os títulos do campeão e o baú de escolha mítico.
 */
export function CampeonatoPainel({ tokenFresco, abrirReplay, aviso, setAviso }: { tokenFresco: Token; abrirReplay: (r: Replay) => void; aviso: Aviso; setAviso: (a: Aviso) => void }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoCampeonato | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/campeonato');
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível carregar o Campeonato agora.'));
      return;
    }
    setEstado(r.dados as unknown as EstadoDoCampeonato);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const emAndamento = estado?.edicao?.estado === 'andamento';
  useEffect(() => {
    if (!emAndamento) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar();
    }, ATUALIZAR_MS);
    return () => window.clearInterval(id);
  }, [carregar, emAndamento]);

  async function assistir(dia: string, rodada: number, l: LutaNaTela, nomeDaRodada: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, '/api/campeonato', { acao: 'replay', dia, rodada, luta: l.indice });
    setOcupado(false);
    if (!r.ok) return setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
    const d = r.dados as unknown as { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela } };
    abrirReplay({ combate: d.combate, lados: d.lados, titulo: `Campeonato · ${nomeDaRodada}` });
  }

  async function abrirBau(bau: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, '/api/arena', { acao: 'abrirBau', bau, carta: escolhas[bau] });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? 'Feito.'), erro: !r.ok });
    await carregar();
  }

  if (erro) return <p role="alert" className="text-sm" style={{ color: VERMELHO }}>{erro}</p>;
  if (!estado) return <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>;
  const entra = estado.meusPontos >= estado.pontosParaEntrar;
  const e = estado.edicao;

  return (
    <>
      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
      {estado.baus.map((b) => (
        <section key={b.id} className="rounded-sm border px-3 py-2 flex flex-col gap-1.5" style={{ borderColor: OURO, backgroundColor: '#2A2114' }} aria-label="Baú de escolha mítico">
          <span className="text-xs font-bold flex items-center gap-1" style={{ color: '#F5E3B3' }}><Gift className="w-3.5 h-3.5" /> Baú de escolha mítico (carta ou emblema)</span>
          <span className="text-[11px]" style={{ color: colors.text.secondary }}>{b.origem}</span>
          <div className="flex gap-1.5">
            <select value={escolhas[b.id] ?? ''} onChange={(ev) => setEscolhas((x) => ({ ...x, [b.id]: ev.target.value }))} aria-label="Carta ou emblema mítico" className="flex-1 min-w-0 rounded-sm border px-2 py-1 text-xs" style={{ backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary }}>
              <option value="">Escolha…</option>
              {estado.opcoesMiticas.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </select>
            <button type="button" onClick={() => void abrirBau(b.id)} disabled={ocupado || !escolhas[b.id]} className="rounded-sm border px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
              Abrir
            </button>
          </div>
        </section>
      ))}

      <section className="rounded-sm border px-3 py-2 flex flex-col gap-1" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }} aria-label="Próximo Campeonato">
        <span className="text-sm font-bold" style={{ color: '#F5E3B3' }}>Próximo: {quando(estado.proxima.inicio)}</span>
        <span className="text-[11px]" style={{ color: colors.text.secondary }}>
          Entram sozinhos, às 20h, os do Ascendente para cima na Arena ranqueada ({estado.pontosParaEntrar.toLocaleString('pt-BR')} pontos), no mínimo 32. As lutas são automáticas, uma rodada a cada 5 minutos.
        </span>
        <span className="text-xs font-semibold" style={{ color: entra ? VERDE : '#E6C775' }}>
          {entra ? `Com ${estado.meusPontos.toLocaleString('pt-BR')} pontos na ranqueada, você entra.` : `Você tem ${estado.meusPontos.toLocaleString('pt-BR')} pontos na ranqueada: faltam ${(estado.pontosParaEntrar - estado.meusPontos).toLocaleString('pt-BR')} para entrar.`}
        </span>
        {estado.vitorias > 0 && (
          <span className="text-xs flex items-center gap-1" style={{ color: OURO }}><Crown className="w-3.5 h-3.5" /> Você já ganhou {estado.vitorias} {estado.vitorias === 1 ? 'Campeonato' : 'Campeonatos'}.</span>
        )}
      </section>

      {e && (
        <section className="flex flex-col gap-1.5" aria-label="Chave do Campeonato">
          <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Campeonato de {dataBr(e.dia)}</h2>
          {e.estado === 'cancelado' ? (
            <p className="text-xs" style={{ color: colors.text.secondary }}>Não aconteceu: eram precisos 32 jogadores e havia {e.jogadores}.</p>
          ) : (
            <>
              <p className="text-xs" style={{ color: colors.text.secondary }}>
                {e.jogadores} jogadores{e.entrei ? ' (você está na chave)' : ''}.{' '}
                {e.estado === 'andamento' && e.proximaRodadaEm ? `Próxima rodada às ${quando(e.proximaRodadaEm, false)}.` : ''}
              </p>
              {e.campeao && (
                <p className="text-sm font-bold flex items-center gap-1" style={{ color: OURO }}><Crown className="w-4 h-4" /> Campeão: {e.campeao}</p>
              )}
              {[...e.rodadas].reverse().map((r, k) => {
                const indice = e.rodadas.length - 1 - k;
                const lutas = r.lutas.filter((l) => l.a || l.b);
                return (
                  <details key={indice} open={k === 0 || lutas.some((l) => l.minha)} className="text-xs">
                    <summary className="cursor-pointer font-semibold" style={{ color: '#F5E3B3' }}>{r.nome} · {lutas.length} {lutas.length === 1 ? 'luta' : 'lutas'}</summary>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {lutas.map((l) => (
                        <Luta key={l.indice} l={l} ocupado={ocupado} assistir={() => void assistir(e.dia, indice, l, r.nome)} />
                      ))}
                    </ul>
                  </details>
                );
              })}
            </>
          )}
        </section>
      )}

      <details className="text-[11px]" style={{ color: colors.text.secondary }}>
        <summary className="cursor-pointer">Prêmios e títulos</summary>
        <ul className="mt-1 flex flex-col gap-0.5">
          {estado.faixas.map((f) => (
            <li key={f.id}>
              <b>{f.nome}</b>: {f.ouro.toLocaleString('pt-BR')} de ouro, {f.diamantes} Diamantes
              {Object.entries(f.selos).map(([s, n]) => `, ${n} Selo ${NOME_DO_SELO[s] ?? s}`).join('')}
              {f.bauMitico ? ' e baú de escolha mítico (carta ou emblema)' : ''}
            </li>
          ))}
          <li className="mt-1">
            Títulos do campeão: {estado.titulos.map((t) => `${TITULO_MAP[t.titulo]?.nome ?? t.titulo} (${t.vitorias} ${t.vitorias === 1 ? 'vitória' : 'vitórias'})`).join(', ')}. A moldura entra quando houver a arte.
          </li>
        </ul>
      </details>
      <p className="text-[10px]" style={{ color: colors.text.secondary }}>
        Empate: passa quem terminou com mais vida em %; com a mesma vida, quem tinha mais pontos.
      </p>
    </>
  );
}
