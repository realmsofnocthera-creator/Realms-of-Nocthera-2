'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Coins, Minus, Plus, X } from 'lucide-react';
import { IconeEspaco } from '@/components/equipamento/IconeEspaco';
import type { CharacterDocument } from '@/server/characterService';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import type { EspacoArmadura } from '@/rules/armaduras';
import { percentualCustoReforja } from '@/rules/armas';
import {
  ConjuntoTela,
  DetalhePecaTela,
  ESTRELAS_ARMADURA,
  MinhaPecaTela,
  conjuntosDaTela,
  detalheDaPeca,
  minhasPecasTela,
  orbesDaTela,
  xpDosOrbes,
} from '@/lib/armaduraTela';
import { COR_RARIDADE_ARMA } from '@/lib/forjaTela';
import { NOCTHERA_THEME } from '@/theme/theme';

const OURO = '#C8A656';
const DESTAQUE = '#F3C769';

interface ArmaduraScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

type Aba = 'conjuntos' | 'minhas';

const estrelas = (n: number) => '★'.repeat(n);

/** Chama uma rota do Ferreiro e devolve a resposta (ou lança a mensagem de erro do servidor). */
async function chamar<T>(rota: string, corpo: unknown, tokenFresco: () => Promise<string | null>): Promise<T> {
  const token = await tokenFresco();
  if (!token) throw new Error('Sessão expirada. Faça login de novo.');
  const res = await fetch(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(corpo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir no Ferreiro.');
  return data as T;
}

/**
 * Melhorar armadura: a lista dos conjuntos (sem árvore), fabricar peças, e nas peças que o personagem tem,
 * usar orbes de armadura (nível 0 a 30) e reforjar. Toda regra é conferida no servidor.
 */
export function ArmaduraScreen({ character, onCharacterChange, tokenFresco }: ArmaduraScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [aba, setAba] = useState<Aba>('conjuntos');
  const [estrela, setEstrela] = useState(1);
  const [selecionada, setSelecionada] = useState<{ pecaId: string; armaduraId?: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const conjuntos = useMemo(() => conjuntosDaTela(character), [character]);
  const minhas = useMemo(() => minhasPecasTela(character), [character]);
  const detalhe = selecionada ? detalheDaPeca(selecionada.pecaId, character) : null;

  const abrir = (pecaId: string, armaduraId?: string) => {
    setErro(null);
    setSelecionada({ pecaId, armaduraId });
  };

  const executar = async (acao: () => Promise<{ character: CharacterDocument; armadura: ArmaduraPersonagem }>, mensagem: (a: ArmaduraPersonagem) => string) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await acao();
      onCharacterChange(r.character);
      setAviso(mensagem(r.armadura));
      setSelecionada((s) => (s ? { pecaId: s.pecaId, armaduraId: r.armadura.id } : s));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no Ferreiro.');
    } finally {
      setOcupado(false);
    }
  };

  const fabricar = (d: DetalhePecaTela) =>
    executar(
      () => chamar('/api/armadura/fabricar', { pecaId: d.pecaId }, tokenFresco),
      (a) => `${d.nome} fabricada! Atributo sorteado: ${a.atributo === 'arcano' ? 'Arcano' : a.atributo === 'vigor' ? 'Vigor' : 'Vitalidade'} +${a.pontos}.`
    );
  const reforjar = (m: MinhaPecaTela) =>
    executar(() => chamar('/api/armadura/reforjar', { armaduraId: m.id }, tokenFresco), (a) => `${m.nome} reforjada: ${m.atributo} +${a.pontos}.`);
  const usarOrbes = (m: MinhaPecaTela, orbes: Record<string, number>) =>
    executar(() => chamar('/api/armadura/orbes', { armaduraId: m.id, orbes }, tokenFresco), () => `${m.nome} recebeu os orbes.`);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(48,28,14,0.92) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-2.5 pb-4">
        <header className="flex items-center justify-between">
          <Link href="/ferreiro" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Ferreiro
          </Link>
          <span className="inline-flex items-center gap-1 text-xs font-cinzel font-bold" style={{ color: '#E6C775' }} aria-label={`Ouro: ${character.ouro}`}>
            <Coins className="w-3.5 h-3.5" /> {character.ouro.toLocaleString('pt-BR')}
          </span>
        </header>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-cinzel tracking-widest uppercase" style={{ color: colors.text.secondary }}>Ferreiro › Melhorar armadura</span>
          <h1 className="text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Armaduras</h1>
        </div>

        <nav aria-label="Abas das armaduras" className="grid grid-cols-2 rounded-sm border-2 overflow-hidden" style={{ borderColor: OURO }}>
          {([['conjuntos', 'Conjuntos'], ['minhas', `Minhas peças (${minhas.length})`]] as const).map(([id, nome]) => (
            <button key={id} type="button" aria-pressed={aba === id} onClick={() => setAba(id)} className="py-1.5 text-xs font-cinzel font-bold uppercase cursor-pointer" style={{ backgroundColor: aba === id ? OURO : colors.background.secondary, color: aba === id ? colors.background.primary : '#E6C775' }}>
              {nome}
            </button>
          ))}
        </nav>

        {aviso && (
          <div role="status" className="flex items-start justify-between gap-2 rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#1E3A24', color: '#BFEFC6' }}>
            <span>{aviso}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setAviso(null)} className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {aba === 'conjuntos' ? (
          <>
            <div role="group" aria-label="Estrela do conjunto" className="flex gap-1 overflow-x-auto pb-1">
              {ESTRELAS_ARMADURA.map((e) => (
                <button key={e} type="button" aria-pressed={estrela === e} onClick={() => setEstrela(e)} className="shrink-0 px-2 py-1 rounded-sm border text-[11px] font-cinzel font-bold cursor-pointer" style={{ backgroundColor: estrela === e ? `${OURO}33` : colors.background.secondary, borderColor: estrela === e ? DESTAQUE : `${colors.border.default}99`, color: estrela === e ? '#F5E3B3' : colors.text.secondary }}>
                  {e}★
                </button>
              ))}
            </div>
            <section aria-label="Conjuntos de armadura" className="flex flex-col gap-2">
              {conjuntos.filter((c) => c.estrela === estrela).map((c) => (
                <CartaoConjunto key={c.conjuntoId} conjunto={c} aberta={selecionada?.pecaId ?? null} onAbrir={abrir} />
              ))}
            </section>
          </>
        ) : (
          <section aria-label="Minhas peças" className="flex flex-col gap-1.5">
            {minhas.length === 0 ? (
              <div className="rounded-sm border-2 p-5 text-center text-sm" style={{ backgroundColor: colors.background.secondary, borderColor: `${colors.border.default}99`, color: colors.text.secondary }}>
                Você ainda não tem peças de armadura. Fabrique na aba Conjuntos.
              </div>
            ) : (
              minhas.map((m) => (
                <button key={m.id} type="button" onClick={() => abrir(m.pecaId, m.id)} className="flex items-center gap-2.5 rounded-sm border-2 px-2.5 py-2 text-left cursor-pointer" style={{ backgroundColor: colors.background.secondary, borderColor: `${m.cor}99` }}>
                  <span className="flex-1 flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold truncate" style={{ color: m.cor }}>{m.nome}</span>
                    <span className="text-[10px]" style={{ color: colors.text.secondary }}>{m.espacoNome} · {m.fixo} · {m.atributo} +{m.pontos}</span>
                    <BarraXp m={m} />
                  </span>
                  <span className="text-[13px] font-cinzel font-black" style={{ color: '#F5E3B3' }}>Nv. {m.nivel}</span>
                </button>
              ))
            )}
          </section>
        )}
      </div>

      {detalhe && (
        <FolhaPeca
          detalhe={detalhe}
          armaduraId={selecionada?.armaduraId}
          character={character}
          ocupado={ocupado}
          erro={erro}
          onFechar={() => setSelecionada(null)}
          onFabricar={() => fabricar(detalhe)}
          onReforjar={reforjar}
          onUsarOrbes={usarOrbes}
          onTrocar={(id) => setSelecionada({ pecaId: detalhe.pecaId, armaduraId: id })}
        />
      )}
    </main>
  );
}

function BarraXp({ m }: { m: MinhaPecaTela }) {
  const pct = m.xpDoNivel === 0 ? 100 : Math.round((m.xpNoNivel / m.xpDoNivel) * 100);
  return (
    <span className="mt-1 block h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2A' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`XP do nível ${m.nivel}`}>
      <span className="block h-full" style={{ width: `${pct}%`, backgroundColor: DESTAQUE }} />
    </span>
  );
}

function CartaoConjunto({ conjunto: c, aberta, onAbrir }: { conjunto: ConjuntoTela; aberta: string | null; onAbrir: (pecaId: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const cor = COR_RARIDADE_ARMA[c.raridade];
  return (
    <article aria-label={`Conjunto ${c.nome}`} className="rounded-sm border-2 px-2.5 py-2 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: `${cor}88` }}>
      <h2 className="text-[13px] font-cinzel font-bold flex items-baseline justify-between gap-2" style={{ color: '#F5E3B3' }}>
        <span><span style={{ color: OURO }}>{estrelas(c.estrela)}</span> {c.nome}</span>
        <span className="text-[10px] font-sans font-semibold" style={{ color: cor }}>{c.raridadeNome} · {c.estilo}</span>
      </h2>
      <div className="grid grid-cols-5 gap-1.5">
        {c.pecas.map((p) => (
          <button
            key={p.pecaId}
            type="button"
            aria-label={`${p.nome} (${p.espacoNome}). ${p.estado === 'tenho' ? `Você tem ${p.quantas}` : p.estado === 'disponivel' ? 'Pronta para fabricar' : 'Falta material ou ouro'}`}
            onClick={() => onAbrir(p.pecaId)}
            className="relative aspect-square rounded-sm border-2 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            style={{
              backgroundColor: colors.background.primary,
              borderColor: aberta === p.pecaId || p.estado === 'disponivel' ? DESTAQUE : `${cor}99`,
              boxShadow: p.estado === 'disponivel' ? `0 0 0 2px ${DESTAQUE}55, 0 0 10px ${DESTAQUE}66` : undefined,
            }}
          >
            <IconeEspaco espaco={p.espaco} className="w-6 h-6" style={{ color: cor }} />
            <span className="text-[8px] leading-none" style={{ color: colors.text.secondary }}>{p.espacoNome}</span>
            {p.estado === 'tenho' && <Check className="absolute -top-1.5 -right-1.5 w-4 h-4 p-0.5 rounded-full" style={{ backgroundColor: '#5FCB6A', color: colors.background.primary }} />}
            {p.estado === 'faltaMaterial' && <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#C25B4F' }} />}
          </button>
        ))}
      </div>
    </article>
  );
}

function Linha({ rotulo, valor, cor }: { rotulo: React.ReactNode; valor: React.ReactNode; cor?: string }) {
  return (
    <div className="flex justify-between gap-3 text-[12px]">
      <span style={{ color: NOCTHERA_THEME.colors.text.secondary }}>{rotulo}</span>
      <span className="text-right font-semibold" style={{ color: cor }}>{valor}</span>
    </div>
  );
}

function FolhaPeca(props: {
  detalhe: DetalhePecaTela;
  armaduraId?: string;
  character: CharacterDocument;
  ocupado: boolean;
  erro: string | null;
  onFechar: () => void;
  onFabricar: () => void;
  onReforjar: (m: MinhaPecaTela) => void;
  onUsarOrbes: (m: MinhaPecaTela, orbes: Record<string, number>) => void;
  onTrocar: (armaduraId: string) => void;
}) {
  const { detalhe: d, character, ocupado, erro } = props;
  const { colors } = NOCTHERA_THEME;
  const minha = d.minhas.find((m) => m.id === props.armaduraId) ?? d.minhas[0];
  const receita = [...d.materiais, ...(d.diversos ? [d.diversos] : [])];
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Detalhes de ${d.nome}`}>
      <button type="button" aria-label="Fechar detalhes" onClick={props.onFechar} className="absolute inset-0 cursor-default" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <div className="relative w-full max-w-[480px] max-h-[88dvh] overflow-y-auto rounded-t-md border-2 border-b-0 px-3.5 pt-3 pb-4 flex flex-col gap-2.5" style={{ backgroundColor: colors.background.secondary, borderColor: d.cor }}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-cinzel font-extrabold leading-tight" style={{ color: d.cor }}>{d.nome}</h2>
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>{d.raridadeNome} · {d.espacoNome} · {d.estilo} · {estrelas(d.estrela)} {d.conjunto}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={props.onFechar} className="cursor-pointer"><X className="w-5 h-5" style={{ color: colors.text.secondary }} /></button>
        </div>

        <div className="rounded-sm border p-2 flex flex-col gap-1" style={{ borderColor: `${colors.border.default}99` }}>
          <Linha rotulo={d.fixo} valor={`${d.fixoNivel0} (Nv. 30: ${d.fixoNivel30})`} cor="#F5E3B3" />
          <Linha rotulo="Atributo sorteado" valor={d.sorteio} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-[11px] font-cinzel font-bold uppercase tracking-wider" style={{ color: OURO }}>Habilidades</h3>
          {d.habilidades.map((h) => (
            <div key={h.id} className="text-[12px]">
              <span className="font-semibold" style={{ color: '#F5E3B3' }}>{h.nome} Nv. {h.nivel}</span>
              <span style={{ color: colors.text.secondary }}> — {h.efeito}</span>
            </div>
          ))}
        </div>

        {minha && (
          <MinhaPecaPainel
            key={minha.id}
            m={minha}
            outras={d.minhas}
            character={character}
            ocupado={ocupado}
            percentualReforja={percentualCustoReforja(minha.reforjas)}
            onTrocar={props.onTrocar}
            onReforjar={() => props.onReforjar(minha)}
            onUsarOrbes={(orbes) => props.onUsarOrbes(minha, orbes)}
          />
        )}

        <div className="flex flex-col gap-1">
          <h3 className="text-[11px] font-cinzel font-bold uppercase tracking-wider" style={{ color: OURO }}>Receita</h3>
          {receita.map((m) => <Linha key={m.id} rotulo={m.nome} cor={m.ok ? '#BFEFC6' : '#E5736B'} valor={`${m.tem}/${m.precisa}`} />)}
          <Linha rotulo="Ouro" cor={d.ouro.ok ? '#BFEFC6' : '#E5736B'} valor={`${d.ouro.tem.toLocaleString('pt-BR')}/${d.ouro.precisa.toLocaleString('pt-BR')}`} />
        </div>

        {erro && <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>}

        <button type="button" disabled={!d.podeFabricar || ocupado} onClick={props.onFabricar} className="w-full py-2.5 rounded-sm border-2 font-cinzel font-extrabold uppercase tracking-wider text-sm enabled:cursor-pointer disabled:cursor-not-allowed" style={{ backgroundColor: d.podeFabricar ? OURO : colors.background.primary, borderColor: d.podeFabricar ? DESTAQUE : `${colors.border.default}99`, color: d.podeFabricar ? colors.background.primary : colors.text.secondary }}>
          {ocupado ? 'Forjando...' : d.podeFabricar ? (d.minhas.length > 0 ? 'Fabricar outra' : 'Fabricar') : 'Falta material ou ouro'}
        </button>
      </div>
    </div>
  );
}

function MinhaPecaPainel(props: {
  m: MinhaPecaTela;
  outras: MinhaPecaTela[];
  character: CharacterDocument;
  ocupado: boolean;
  percentualReforja: number;
  onTrocar: (id: string) => void;
  onReforjar: () => void;
  onUsarOrbes: (orbes: Record<string, number>) => void;
}) {
  const { m, character, ocupado } = props;
  const { colors } = NOCTHERA_THEME;
  const [escolha, setEscolha] = useState<Record<string, number>>({});
  const orbes = orbesDaTela(character);
  const previa = xpDosOrbes(escolha, m.xp);
  const noMaximo = m.nivel >= 30;
  const mudar = (id: string, delta: number, tenho: number) =>
    setEscolha((e) => ({ ...e, [id]: Math.max(0, Math.min(tenho, (e[id] ?? 0) + delta)) }));
  const usar = Object.fromEntries(Object.entries(escolha).filter(([, q]) => q > 0));

  return (
    <div className="rounded-sm border p-2 flex flex-col gap-1.5" style={{ borderColor: `${DESTAQUE}88` }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-cinzel font-bold uppercase tracking-wider" style={{ color: OURO }}>Sua peça</h3>
        {props.outras.length > 1 && (
          <select aria-label="Escolher a sua peça" value={m.id} onChange={(e) => props.onTrocar(e.target.value)} className="text-[11px] rounded px-1 py-0.5" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
            {props.outras.map((o, i) => <option key={o.id} value={o.id}>#{i + 1} · Nv. {o.nivel} · {o.atributo} +{o.pontos}</option>)}
          </select>
        )}
      </div>
      <Linha rotulo={`Nível ${m.nivel}/30`} valor={noMaximo ? 'Máximo' : `${m.xpNoNivel}/${m.xpDoNivel} XP`} cor="#F5E3B3" />
      <BarraXp m={m} />
      <Linha rotulo="Atributo sorteado" valor={`${m.atributo} +${m.pontos} · ${m.reforjas} reforja(s)`} cor="#BFEFC6" />
      <Linha rotulo="Atributo fixo agora" valor={m.fixo} />

      {!noMaximo && (
        <div className="flex flex-col gap-1 pt-1">
          {orbes.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span style={{ color: o.cor }}>{o.nome} <span style={{ color: colors.text.secondary }}>(+{o.xp} · tem {o.tenho})</span></span>
              <span className="inline-flex items-center gap-1">
                <button type="button" aria-label={`Menos ${o.nome}`} disabled={!escolha[o.id]} onClick={() => mudar(o.id, -1, o.tenho)} className="w-6 h-6 rounded border flex items-center justify-center enabled:cursor-pointer disabled:opacity-40" style={{ borderColor: `${OURO}88` }}><Minus className="w-3 h-3" /></button>
                <span className="w-6 text-center font-bold">{escolha[o.id] ?? 0}</span>
                <button type="button" aria-label={`Mais ${o.nome}`} disabled={(escolha[o.id] ?? 0) >= o.tenho} onClick={() => mudar(o.id, 1, o.tenho)} className="w-6 h-6 rounded border flex items-center justify-center enabled:cursor-pointer disabled:opacity-40" style={{ borderColor: `${OURO}88` }}><Plus className="w-3 h-3" /></button>
              </span>
            </div>
          ))}
          {previa.total > 0 && (
            <span className="text-[11px]" style={{ color: colors.text.secondary }}>
              +{previa.aproveitado} XP → nível {previa.nivelDepois}{previa.aproveitado < previa.total ? ` (${previa.total - previa.aproveitado} de XP se perdem no nível 30)` : ''}
            </span>
          )}
          <button type="button" disabled={previa.total === 0 || ocupado} onClick={() => { props.onUsarOrbes(usar); setEscolha({}); }} className="w-full py-1.5 rounded-sm border-2 font-cinzel font-bold uppercase text-xs enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: DESTAQUE, color: '#F5E3B3' }}>
            Usar orbes
          </button>
        </div>
      )}
      <button type="button" disabled={ocupado} onClick={props.onReforjar} className="w-full py-1.5 rounded-sm border font-cinzel font-bold uppercase text-xs enabled:cursor-pointer disabled:cursor-not-allowed" style={{ borderColor: `${OURO}88`, color: '#E6C775' }}>
        Reforjar ({props.percentualReforja}% da receita)
      </button>
    </div>
  );
}
