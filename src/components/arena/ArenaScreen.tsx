'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gift, RefreshCw } from 'lucide-react';
import type { ResultadoCombatePvp } from '@/game/combat';
import { CampeonatoPainel } from '@/components/arena/CampeonatoPainel';
import { ReplayArena } from '@/components/arena/ReplayArena';
import type { ModoDaArena } from '@/rules/arena';
import { indiceDoRanque, RANQUES } from '@/rules/arenaRanqueada';
import { CLASSES_MAP } from '@/rules/classes';
import type { EstadoDaArena, LadoNaTela, ResultadoDaLuta } from '@/server/arena';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
type Aba = 'arena' | 'ranqueada' | 'campeonato';
const ABAS: readonly { id: Aba; nome: string }[] = [
  { id: 'arena', nome: 'Arena' },
  { id: 'ranqueada', nome: 'Ranqueada' },
  { id: 'campeonato', nome: 'Campeonato' },
];
const NOME_DO_SELO: Readonly<Record<string, string>> = { desgastado: 'Desgastado', encantado: 'Encantado', eternidade: 'Eternidade' };

async function chamar(tokenFresco: Token, modo: ModoDaArena, corpo?: Record<string, unknown>): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(corpo ? '/api/arena' : `/api/arena?modo=${modo}`, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify({ ...corpo, modo }) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const classe = (id: string) => CLASSES_MAP[id]?.nome ?? id;
const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit' });
const ranque = (pontos: number) => RANQUES[indiceDoRanque(pontos)];

function Botao({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-sm border px-3 py-1.5 text-xs font-bold disabled:opacity-50 shrink-0 flex items-center gap-1" style={{ borderColor: OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}>
      {children}
    </button>
  );
}

type Replay = { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; titulo: string; aviso?: string };

/** O conteúdo de uma aba (Arena ou Ranqueada): a semana, os adversários, o pódio, as lutas e (ranqueada) os baús. */
function PainelDaArena({ modo, tokenFresco, abrirReplay, aviso, setAviso }: { modo: ModoDaArena; tokenFresco: Token; abrirReplay: (r: Replay) => void; aviso: { texto: string; erro: boolean } | null; setAviso: (a: { texto: string; erro: boolean } | null) => void }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDaArena | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const ranqueada = modo === 'ranqueada';

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, modo);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível carregar a Arena agora.'));
      return;
    }
    setEstado(r.dados as unknown as EstadoDaArena);
    setErro(null);
  }, [tokenFresco, modo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(corpo: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, modo, corpo);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? 'Não foi possível agora.'), erro: true });
      return null;
    }
    return r.dados;
  }

  async function lutar(uid: string, nome: string) {
    const d = (await agir({ acao: 'lutar', alvo: uid })) as unknown as ResultadoDaLuta | null;
    if (d) abrirReplay({ combate: d.combate, lados: d.lados, titulo: `${ranqueada ? 'Ranqueada' : 'Arena'} · contra ${nome}`, aviso: d.mensagem });
  }

  async function assistir(lutaId: string, titulo: string) {
    const d = (await agir({ acao: 'replay', luta: lutaId })) as { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela } } | null;
    if (d) abrirReplay({ combate: d.combate, lados: d.lados, titulo });
  }

  async function simples(corpo: Record<string, unknown>) {
    const d = await agir(corpo);
    if (d) setAviso({ texto: String(d.mensagem ?? 'Feito.'), erro: false });
    await carregar();
  }

  if (erro) return <p role="alert" className="text-sm" style={{ color: VERMELHO }}>{erro}</p>;
  if (!estado) return <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>;
  if (!estado.podeLutar) return <p role="status" className="text-sm font-semibold" style={{ color: '#E6C775' }}>A Arena abre no nível {estado.nivelNecessario}.</p>;

  const meu = indiceDoRanque(estado.pontos);
  const proximo = RANQUES[meu + 1];
  return (
    <>
      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
      {ranqueada && estado.baus.length > 0 && (
        <section className="rounded-sm border px-3 py-2 flex flex-col gap-1.5" style={{ borderColor: OURO, backgroundColor: '#2A2114' }} aria-label="Baús de escolha">
          {estado.baus.map((b) => (
            <div key={b.id} className="flex flex-col gap-1.5">
              <span className="text-xs font-bold flex items-center gap-1" style={{ color: '#F5E3B3' }}><Gift className="w-3.5 h-3.5" /> Baú de escolha de carta lendária</span>
              <span className="text-[11px]" style={{ color: colors.text.secondary }}>{b.origem}</span>
              <div className="flex gap-1.5">
                <select value={escolhas[b.id] ?? ''} onChange={(e) => setEscolhas((x) => ({ ...x, [b.id]: e.target.value }))} aria-label="Carta lendária" className="flex-1 min-w-0 rounded-sm border px-2 py-1 text-xs" style={{ backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary }}>
                  <option value="">Escolha…</option>
                  {estado.cartasLendarias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <Botao onClick={() => void simples({ acao: 'abrirBau', bau: b.id, carta: escolhas[b.id] })} disabled={ocupado || !escolhas[b.id]}>Abrir</Botao>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-sm border px-3 py-2 flex flex-col gap-1" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }} aria-label="Sua semana">
        <div className="flex justify-between gap-2">
          <span className="text-sm font-bold" style={{ color: '#F5E3B3' }}>
            {ranqueada ? `${RANQUES[meu].nome} · ` : ''}
            {estado.pontos.toLocaleString('pt-BR')} pontos
          </span>
          <span className="text-xs font-bold" style={{ color: OURO }}>{estado.posicao ? `${estado.posicao}º lugar` : 'Sem posição ainda'}</span>
        </div>
        {ranqueada && (
          <span className="text-[11px]" style={{ color: colors.text.secondary }}>
            {proximo ? `Faltam ${(proximo.minimo - estado.pontos).toLocaleString('pt-BR')} pontos para ${proximo.nome}.` : 'Você está no ranque mais alto.'} Vitória atacando: +25; derrota: −15; defender não muda os pontos.
          </span>
        )}
        <span className="text-[11px]" style={{ color: colors.text.secondary }}>
          A semana acaba {hora(estado.acabaEm)}:{' '}
          {ranqueada ? 'a recompensa do seu ranque vai pelo Correio e todo mundo perde 40% dos pontos.' : 'sai o pódio (prêmios pelo Correio) e os pontos voltam a 1.000.'}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs">Lutas hoje: <b>{estado.lutasRestantes}</b> restantes</span>
          {estado.podeComprarLuta && (
            <Botao onClick={() => void simples({ acao: 'comprarLuta' })} disabled={ocupado || estado.diamantes < estado.precoDaLuta}>
              +1 luta · {estado.precoDaLuta} Diamantes
            </Botao>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-1.5" aria-label="Adversários">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Adversários</h2>
          <Botao onClick={() => void simples({ acao: 'trocarLista' })} disabled={ocupado || !!estado.trocaLiberadaEm}>
            <RefreshCw className="w-3.5 h-3.5" /> {estado.trocaLiberadaEm ? `Trocar ${hora(estado.trocaLiberadaEm)}` : 'Trocar lista'}
          </Botao>
        </div>
        {estado.adversarios.length === 0 && <p className="text-xs" style={{ color: colors.text.secondary }}>Ainda não há adversários. Volte daqui a pouco.</p>}
        <ul className="flex flex-col gap-1.5">
          {estado.adversarios.map((a) => (
            <li key={a.uid} className="rounded-sm border px-2.5 py-2 flex items-center justify-between gap-2" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }}>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate" style={{ color: '#F5E3B3' }}>{a.nome}</span>
                <span className="text-[11px]" style={{ color: colors.text.secondary }}>
                  {classe(a.classeId)} · nível {a.nivel} · {ranqueada ? `${ranque(a.pontos).nome} · ` : ''}
                  {a.pontos.toLocaleString('pt-BR')} pontos
                </span>
              </div>
              <Botao onClick={() => void lutar(a.uid, a.nome)} disabled={ocupado || estado.lutasRestantes <= 0}>Lutar</Botao>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-1" aria-label={ranqueada ? 'Os melhores da semana' : 'Pódio da semana'}>
        <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>{ranqueada ? 'Os melhores da semana' : 'Pódio da semana'}</h2>
        {estado.podio.length === 0 ? (
          <p className="text-xs" style={{ color: colors.text.secondary }}>Ninguém lutou ainda nesta semana.</p>
        ) : (
          <ol className="flex flex-col gap-0.5">
            {estado.podio.map((p) => (
              <li key={`${p.posicao}-${p.nome}`} className="flex justify-between gap-2 text-xs">
                <span className="truncate"><b style={{ color: OURO }}>{p.posicao}º</b> {p.nome} <span style={{ color: colors.text.secondary }}>· {classe(p.classeId)} {p.nivel}</span></span>
                <span className="shrink-0">{ranqueada ? `${ranque(p.pontos).nome} · ` : ''}{p.pontos.toLocaleString('pt-BR')}</span>
              </li>
            ))}
          </ol>
        )}
        <details className="text-[11px]" style={{ color: colors.text.secondary }}>
          <summary className="cursor-pointer">{ranqueada ? 'Recompensas por ranque' : 'Prêmios da semana'}</summary>
          {ranqueada ? (
            <ul className="mt-1 flex flex-col gap-0.5">
              {RANQUES.map((r) => (
                <li key={r.id}>
                  <b>{r.nome}</b> ({r.minimo.toLocaleString('pt-BR')}+): {r.ouro.toLocaleString('pt-BR')} de ouro
                  {r.diamantes ? `, ${r.diamantes} Diamantes` : ''}
                  {Object.entries(r.selos).map(([s, n]) => `, ${n} Selo ${NOME_DO_SELO[s] ?? s}`).join('')}, título &quot;{r.nome} da Arena&quot;
                  {r.bauDeCartaLendaria ? ' e baú de escolha de carta lendária' : ''}
                </li>
              ))}
              <li>Precisa de pelo menos 1 luta na semana. A moldura de cada ranque entra quando houver a arte.</li>
            </ul>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5">
              {estado.faixas.map((f) => (
                <li key={f.de}>
                  {f.nome}: {f.ouro.toLocaleString('pt-BR')} de ouro{f.diamantes ? ` e ${f.diamantes} Diamantes` : ''}
                  {f.ate === null ? ' (com pelo menos 1 luta)' : ''}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      <section className="flex flex-col gap-1" aria-label="Suas lutas">
        <h2 className="text-sm font-cinzel font-bold" style={{ color: '#F5E3B3' }}>Suas lutas</h2>
        {estado.historico.length === 0 && <p className="text-xs" style={{ color: colors.text.secondary }}>Nenhuma luta nesta semana.</p>}
        <ul className="flex flex-col gap-1">
          {estado.historico.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">
                <b style={{ color: h.empate ? '#E6C775' : h.venceu ? VERDE : VERMELHO }}>{h.empate ? 'Empate' : h.venceu ? 'Vitória' : 'Derrota'}</b>{' '}
                {h.atacou ? 'contra' : 'defendendo de'} {h.adversario} <span style={{ color: colors.text.secondary }}>({h.pontos >= 0 ? '+' : ''}{h.pontos})</span>
              </span>
              <button type="button" onClick={() => void assistir(h.id, `${h.atacou ? 'Você' : h.adversario} atacou ${h.atacou ? h.adversario : 'você'}`)} disabled={ocupado} className="shrink-0 underline disabled:opacity-50" style={{ color: OURO }}>
                Assistir
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/**
 * Arena (7.5): a Arena (5 lutas por dia e mais 5 por Diamantes, pódio semanal) e a Arena ranqueada (10 ranques, 5
 * lutas por dia, recompensa pelo ranque). Escolher um adversário da lista e lutar contra a ficha atual dele; o replay
 * das últimas 20 lutas de cada modo. E o Campeonato quinzenal (chave automática, prêmios por colocação).
 */
export function ArenaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [aba, setAba] = useState<Aba>('arena');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  // remonta o painel depois do replay, para recarregar os pontos e o histórico
  const [versao, setVersao] = useState(0);

  if (replay) {
    return (
      <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
        <div className="w-full max-w-[520px]">
          <ReplayArena
            combate={replay.combate}
            lados={replay.lados}
            titulo={replay.titulo}
            onFim={() => {
              if (replay.aviso) setAviso({ texto: replay.aviso, erro: false });
              setReplay(null);
              setVersao((v) => v + 1);
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/hub" aria-label="Voltar" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Arena</h1>
        </header>
        <div role="tablist" aria-label="Arena" className="flex flex-wrap gap-1.5">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => {
                setAba(a.id);
                setAviso(null);
              }}
              className="rounded-sm border px-2.5 py-1 text-xs font-bold font-cinzel"
              style={{ borderColor: OURO, backgroundColor: aba === a.id ? OURO : '#221C16', color: aba === a.id ? '#1A140E' : '#F5E3B3' }}
            >
              {a.nome}
            </button>
          ))}
        </div>
        {aba === 'campeonato' ? (
          <CampeonatoPainel key={`campeonato-${versao}`} tokenFresco={tokenFresco} abrirReplay={setReplay} aviso={aviso} setAviso={setAviso} />
        ) : (
          <PainelDaArena key={`${aba}-${versao}`} modo={aba} tokenFresco={tokenFresco} abrirReplay={setReplay} aviso={aviso} setAviso={setAviso} />
        )}
      </div>
    </main>
  );
}
