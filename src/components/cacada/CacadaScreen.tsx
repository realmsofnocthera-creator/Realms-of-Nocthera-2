'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Lock, Star } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import type { ResultadoCombate } from '@/game/combat';
import type { RanqueCacada } from '@/rules/cacada';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { dropsTela, estrelasDoRanque, monstrosDaEstrela, ranquesDaCacada } from '@/lib/cacadaTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { CombateCacada } from './CombateCacada';

interface CacadaScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

interface RespostaCacadaTela {
  resultado: ResultadoCombate;
  character: CharacterDocument;
  levelUps: number;
  mensagens: string[];
  cacada: { monstroId: string; estrela: number; drops: { materialId: string; quantidade: number }[]; xpBase: number; xpGanho: number; chaveVencida?: number };
}

type Etapa =
  | { tipo: 'ranque' }
  | { tipo: 'estrelas'; ranque: RanqueCacada }
  | { tipo: 'catalogo'; ranque: RanqueCacada; estrela: number }
  | { tipo: 'combate'; ranque: RanqueCacada; estrela: number; antes: CharacterDocument; resposta: RespostaCacadaTela }
  | { tipo: 'resultado'; ranque: RanqueCacada; estrela: number; antes: CharacterDocument; resposta: RespostaCacadaTela };

const OURO = '#C8A656';
const estrelas = (n: number) => '★'.repeat(n);

/**
 * Provação da Caçada (estilo Monster Hunter): Ranque → Estrela → Catálogo de monstros → luta → resultado.
 * Toda regra (nível, monstro-chave, XP, drops) é conferida no servidor; a tela só mostra.
 */
export function CacadaScreen({ character, onCharacterChange, tokenFresco }: CacadaScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'ranque' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const cacar = async (monstroId: string, ranque: RanqueCacada, estrela: number) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error('Sessão expirada. Faça login de novo.');
      const combateId = `cac-${crypto.randomUUID()}`;
      const res = await fetch('/api/cacada/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monstroId, combateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar a caçada.');
      setEtapa({ tipo: 'combate', ranque, estrela, antes: character, resposta: data as RespostaCacadaTela });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao iniciar a caçada.');
    } finally {
      setOcupado(false);
    }
  };

  const terminarCombate = useCallback(() => {
    setEtapa((e) => {
      if (e.tipo !== 'combate') return e;
      onCharacterChange(e.resposta.character);
      return { ...e, tipo: 'resultado' };
    });
  }, [onCharacterChange]);

  if (etapa.tipo === 'combate') {
    const monstro = MONSTROS_CACADA_MAP[etapa.resposta.cacada.monstroId];
    return (
      <CombateCacada
        resultado={etapa.resposta.resultado}
        personagem={etapa.antes}
        monstro={monstro}
        titulo={`Caçada · ${etapa.estrela}★ ${monstro.nome}`}
        onFim={terminarCombate}
      />
    );
  }

  const voltar = () => {
    setErro(null);
    if (etapa.tipo === 'estrelas') setEtapa({ tipo: 'ranque' });
    else if (etapa.tipo === 'catalogo' || etapa.tipo === 'resultado') setEtapa({ tipo: 'estrelas', ranque: etapa.ranque });
  };

  const cartao = (conteudo: React.ReactNode, opcoes: { bloqueado?: boolean; onClick?: () => void; destaque?: boolean; rotulo: string }) => (
    <button
      type="button"
      aria-label={opcoes.rotulo}
      disabled={opcoes.bloqueado || !opcoes.onClick}
      onClick={opcoes.onClick}
      className="w-full text-left rounded-sm border-2 px-3 py-2.5 transition-all active:scale-[0.99] disabled:cursor-not-allowed enabled:cursor-pointer"
      style={{
        backgroundColor: colors.background.secondary,
        borderColor: opcoes.bloqueado ? `${colors.border.default}66` : opcoes.destaque ? '#F3C769' : OURO,
        opacity: opcoes.bloqueado ? 0.6 : 1,
      }}
    >
      {conteudo}
    </button>
  );

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(32,24,18,0.92) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center justify-between">
          {etapa.tipo === 'ranque' ? (
            <Link href="/provacoes" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
              <ArrowLeft className="w-4 h-4" /> Provações
            </Link>
          ) : (
            <button type="button" onClick={voltar} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase cursor-pointer" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{character.nome} · Nv. {character.nivel}</span>
        </header>

        <h1 className="text-center text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Provação da Caçada</h1>

        {erro && (
          <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>
        )}

        {etapa.tipo === 'ranque' && (
          <section aria-label="Escolha o ranque" className="flex flex-col gap-2.5">
            {ranquesDaCacada(character).map((r) =>
              <React.Fragment key={r.ranque}>
                {cartao(
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-cinzel font-black text-lg" style={{ color: '#F3E6CC' }}>{r.nome}</div>
                      <div className="text-xs" style={{ color: colors.text.secondary }}>{r.faixa}</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-cinzel font-bold px-2 py-0.5 rounded border" style={{ borderColor: r.liberado ? OURO : colors.status.danger, color: r.liberado ? '#E6C775' : '#FF8A80' }}>
                      {!r.liberado && <Lock className="w-3 h-3" />} {r.liberado ? 'Liberado' : r.requisito}
                    </span>
                  </div>,
                  { bloqueado: !r.liberado, onClick: () => setEtapa({ tipo: 'estrelas', ranque: r.ranque }), rotulo: `${r.nome}${r.liberado ? '' : ` - requer ${r.requisito}`}` }
                )}
              </React.Fragment>
            )}
          </section>
        )}

        {etapa.tipo === 'estrelas' && (
          <section aria-label="Níveis de perigo" className="flex flex-col gap-2">
            {estrelasDoRanque(character, etapa.ranque).map((e) =>
              <React.Fragment key={e.estrela}>
                {cartao(
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-cinzel font-black text-base" style={{ color: '#F3C769' }}>{estrelas(e.estrela)}</div>
                      <div className="text-[11px]" style={{ color: colors.text.secondary }}>
                        Nível {e.nivelMinimo} · {e.quantidadeMonstros} monstros{e.chave ? ` · chave: ${e.chave}` : ''}
                      </div>
                    </div>
                    {e.liberada ? (
                      e.chaveVencida && <span className="inline-flex items-center gap-1 text-[11px] font-cinzel font-bold" style={{ color: '#5FCB6A' }}><Check className="w-3.5 h-3.5" /> Chave vencida</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-cinzel font-bold text-right" style={{ color: '#FF8A80' }}><Lock className="w-3 h-3 shrink-0" /> {e.bloqueio}</span>
                    )}
                  </div>,
                  { bloqueado: !e.liberada, onClick: () => setEtapa({ tipo: 'catalogo', ranque: etapa.ranque, estrela: e.estrela }), rotulo: `${e.estrela} estrelas${e.liberada ? '' : ` - ${e.bloqueio}`}` }
                )}
              </React.Fragment>
            )}
          </section>
        )}

        {etapa.tipo === 'catalogo' && (
          <section aria-label="Catálogo de monstros" className="flex flex-col gap-2.5">
            <div className="text-center font-cinzel font-black text-lg" style={{ color: '#F3C769' }}>{estrelas(etapa.estrela)}</div>
            {monstrosDaEstrela(etapa.estrela).map((m) => (
              <article key={m.id} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: m.chave ? '#F3C769' : OURO }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-cinzel font-black text-[15px] flex items-center gap-1" style={{ color: '#F3E6CC' }}>
                      {m.chave && <Crown className="w-4 h-4 shrink-0" style={{ color: '#F3C769' }} aria-label="Monstro-chave" />}
                      <span className="truncate">{m.nome}</span>
                    </div>
                    <div className="text-[11px]" style={{ color: colors.text.secondary }}>{m.tipo} · Nv. {m.nivel}</div>
                  </div>
                  <button type="button" disabled={ocupado} onClick={() => cacar(m.id, etapa.ranque, etapa.estrela)}
                    className="shrink-0 px-3 py-1.5 rounded font-cinzel font-bold text-xs cursor-pointer disabled:opacity-50 active:scale-95"
                    style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                    {ocupado ? '...' : 'Caçar'}
                  </button>
                </div>
                <p className="text-[12px] leading-snug" style={{ color: colors.text.secondary }}>{m.descricao}</p>
                <div className="text-[11px] flex flex-wrap gap-x-3" style={{ color: colors.text.primary }}>
                  {m.elemento && <span>Ataque: <b>{m.elemento}</b></span>}
                  {m.fracoA.length > 0 && <span>Fraco a: <b>{m.fracoA.join(', ')}</b></span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.drops.map((d) => (
                    <span key={d.id} title={`${d.raridadeNome} · ${d.chance}`} className="text-[10px] px-1.5 py-0.5 rounded border font-semibold" style={{ borderColor: `${d.cor}88`, color: d.cor }}>
                      {d.nome} · {d.chance}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {etapa.tipo === 'resultado' && (() => {
          const { resposta, antes } = etapa;
          const venceu = resposta.resultado.vencedor === 'personagem';
          const monstro = MONSTROS_CACADA_MAP[resposta.cacada.monstroId];
          const drops = dropsTela(resposta.cacada.drops.map((d) => d.materialId));
          const ouro = resposta.character.ouro - antes.ouro;
          return (
            <section aria-label="Resultado da caçada" className="flex flex-col gap-2.5">
              <div className="rounded-sm border-2 p-3 text-center flex flex-col gap-1" style={{ backgroundColor: colors.background.secondary, borderColor: venceu ? '#F3C769' : colors.status.danger }}>
                <div className="font-cinzel font-black text-2xl" style={{ color: venceu ? '#F3C769' : '#FF8A80' }}>{venceu ? 'Caçada concluída!' : 'Você foi derrotado'}</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>{monstro.nome} · {estrelas(resposta.cacada.estrela)}</div>
                <div className="flex justify-center gap-4 text-sm font-cinzel font-bold mt-1" style={{ color: colors.text.primary }}>
                  <span>XP +{resposta.cacada.xpGanho}{venceu && resposta.cacada.xpGanho < resposta.cacada.xpBase ? ` (de ${resposta.cacada.xpBase})` : ''}</span>
                  <span style={{ color: ouro >= 0 ? '#F3C769' : '#FF8A80' }}>Ouro {ouro >= 0 ? `+${ouro}` : ouro}</span>
                </div>
                {resposta.levelUps > 0 && <div className="font-cinzel font-bold" style={{ color: '#5FCB6A' }}>Subiu para o nível {resposta.character.nivel}!</div>}
                {resposta.cacada.chaveVencida && (
                  <div className="inline-flex items-center justify-center gap-1 font-cinzel font-bold" style={{ color: '#F3C769' }}>
                    <Star className="w-4 h-4" /> Monstro-chave vencido{resposta.cacada.chaveVencida < 9 ? `: a ${resposta.cacada.chaveVencida + 1}★ está liberada` : ''}
                  </div>
                )}
              </div>
              {venceu && (
                <div className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>
                  <div className="font-cinzel font-bold text-sm" style={{ color: '#E6C775' }}>Materiais obtidos</div>
                  {drops.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-[13px]">
                      <span style={{ color: d.cor }} className="font-semibold">{d.nome}</span>
                      <span className="text-[11px]" style={{ color: d.cor }}>{d.raridadeNome}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={ocupado} onClick={() => cacar(resposta.cacada.monstroId, etapa.ranque, etapa.estrela)}
                  className="py-2 rounded font-cinzel font-bold text-sm cursor-pointer disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                  Caçar de novo
                </button>
                <button type="button" onClick={() => setEtapa({ tipo: 'catalogo', ranque: etapa.ranque, estrela: etapa.estrela })}
                  className="py-2 rounded border font-cinzel font-bold text-sm cursor-pointer" style={{ borderColor: OURO, color: '#E6C775', backgroundColor: colors.background.secondary }}>
                  Catálogo
                </button>
              </div>
              <Link href="/mochila" className="text-center text-xs font-cinzel underline" style={{ color: colors.text.secondary }}>Ver a Mochila</Link>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
