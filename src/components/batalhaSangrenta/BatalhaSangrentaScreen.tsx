'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Crown, Lock, Skull } from 'lucide-react';
import type { CharacterDocument, RespostaBatalhaSangrenta } from '@/server/characterService';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { dificuldadesDaBatalha, nomeDaSubclasse, REGRAS_RESUMO, tentativasDeHoje } from '@/lib/batalhaSangrentaTela';
import { BATALHA_SANGRENTA } from '@/game/batalhaSangrenta';
import { NOCTHERA_THEME } from '@/theme/theme';
import { CombateCacada } from '@/components/cacada/CombateCacada';

interface BatalhaSangrentaScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

type Etapa =
  | { tipo: 'dificuldades' }
  | { tipo: 'combate'; antes: CharacterDocument; resposta: RespostaBatalhaSangrenta; indice: number }
  | { tipo: 'resultado'; antes: CharacterDocument; resposta: RespostaBatalhaSangrenta };

const OURO = '#C8A656';
const estrelas = (n: number) => '★'.repeat(n);
const monstroDe = (id: string) => MONSTROS_CACADA_MAP[id] ?? CHEFES_ESPECIAIS_MAP[id];

/**
 * Provação de Batalha Sangrenta: escolha da dificuldade → lutas em sequência (o HP passa de uma para a outra) →
 * resultado com as recompensas. Toda regra (nível, dificuldade liberada, tentativas do dia, recompensas) é do servidor.
 */
export function BatalhaSangrentaScreen({ character, onCharacterChange, tokenFresco }: BatalhaSangrentaScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'dificuldades' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const batalhar = async (dificuldade: string) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error('Sessão expirada. Faça login de novo.');
      const combateId = `bat-${crypto.randomUUID()}`;
      const res = await fetch('/api/batalha-sangrenta/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dificuldade, combateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar a Batalha Sangrenta.');
      setEtapa({ tipo: 'combate', antes: character, resposta: data as RespostaBatalhaSangrenta, indice: 0 });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao iniciar a Batalha Sangrenta.');
    } finally {
      setOcupado(false);
    }
  };

  const proximaLuta = useCallback(() => {
    setEtapa((e) => {
      if (e.tipo !== 'combate') return e;
      if (e.indice + 1 < e.resposta.ondas.length) return { ...e, indice: e.indice + 1 };
      onCharacterChange(e.resposta.character);
      return { tipo: 'resultado', antes: e.antes, resposta: e.resposta };
    });
  }, [onCharacterChange]);

  if (etapa.tipo === 'combate') {
    const onda = etapa.resposta.ondas[etapa.indice];
    const monstro = monstroDe(onda.monstroId);
    if (onda.resultado && monstro) {
      return (
        <CombateCacada
          key={etapa.indice}
          resultado={onda.resultado}
          personagem={etapa.antes}
          monstro={monstro}
          hpInicialJogador={onda.hpInicial}
          titulo={`Batalha Sangrenta · ${etapa.indice + 1}/${etapa.resposta.ondas.length} ${onda.chefe ? 'Chefe · ' : ''}${monstro.nome}`}
          estrela={etapa.resposta.estrela}
          onFim={proximaLuta}
        />
      );
    }
    // Sem log (não deveria acontecer numa resposta nova): pula direto para o resultado
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
        <button type="button" onClick={proximaLuta} className="px-4 py-2 rounded font-cinzel font-bold text-sm cursor-pointer" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
          Ver resultado
        </button>
      </main>
    );
  }

  const restantes = tentativasDeHoje(character);

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(40,16,16,0.92) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center justify-between">
          {etapa.tipo === 'dificuldades' ? (
            <Link href="/provacoes" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
              <ArrowLeft className="w-4 h-4" /> Provações
            </Link>
          ) : (
            <button type="button" onClick={() => { setErro(null); setEtapa({ tipo: 'dificuldades' }); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase cursor-pointer" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
              <ArrowLeft className="w-4 h-4" /> Dificuldades
            </button>
          )}
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{character.nome} · Nv. {character.nivel}</span>
        </header>

        <h1 className="text-center text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Batalha Sangrenta</h1>

        {erro && (
          <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>
        )}

        {etapa.tipo === 'dificuldades' && (
          <section aria-label="Escolha a dificuldade" className="flex flex-col gap-2.5">
            <div className="rounded-sm border px-3 py-2 text-center" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}88` }}>
              <div className="font-cinzel font-black text-lg" style={{ color: restantes > 0 ? '#F3C769' : '#FF8A80' }} aria-label={`Tentativas restantes hoje: ${restantes} de ${BATALHA_SANGRENTA.tentativasPorDia}`}>
                Tentativas hoje: {restantes}/{BATALHA_SANGRENTA.tentativasPorDia}
              </div>
              <p className="text-[11px] leading-snug mt-1" style={{ color: colors.text.secondary }}>{REGRAS_RESUMO}</p>
            </div>
            {dificuldadesDaBatalha(character).map((d) => (
              <article key={d.id} aria-label={`Dificuldade ${d.nome}`} className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: d.liberada ? OURO : `${colors.border.default}66`, opacity: d.liberada ? 1 : 0.65 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-cinzel font-black text-lg flex items-center gap-1.5" style={{ color: '#F3E6CC' }}>
                      {d.nome}
                      {d.vencida && <Check className="w-4 h-4" style={{ color: '#5FCB6A' }} aria-label="Já vencida" />}
                    </div>
                    <div className="text-[11px]" style={{ color: '#F3C769' }}>Monstros {estrelas(d.estrela)}</div>
                  </div>
                  {d.liberada ? (
                    <button type="button" disabled={ocupado || restantes <= 0} onClick={() => batalhar(d.id)}
                      className="shrink-0 px-3 py-1.5 rounded font-cinzel font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                      {ocupado ? '...' : restantes <= 0 ? 'Sem tentativas' : 'Batalhar'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-cinzel font-bold text-right" style={{ color: '#FF8A80' }}>
                      <Lock className="w-3 h-3 shrink-0" /> {d.bloqueio}
                    </span>
                  )}
                </div>
                <div className="text-[12px] flex items-center gap-1" style={{ color: colors.text.primary }}>
                  <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: '#F3C769' }} />
                  <span>{d.chefes.join(' e ')}</span>
                </div>
                <div className="text-[11px] flex flex-wrap gap-x-3" style={{ color: colors.text.secondary }}>
                  <span>Fragmentos de alma: <b style={{ color: colors.text.primary }}>{d.fragmentos}</b></span>
                  {d.diamantesPendentes && <span>1ª vitória: <b style={{ color: '#5AA7F0' }}>+{BATALHA_SANGRENTA.diamantesDaPrimeiraVitoria} Diamantes</b></span>}
                </div>
                {d.extraSubclasse && <div className="text-[11px]" style={{ color: '#C27BF0' }}>{d.extraSubclasse}</div>}
              </article>
            ))}
          </section>
        )}

        {etapa.tipo === 'resultado' && (() => {
          const { resposta } = etapa;
          const venceu = resposta.chefeVencido;
          return (
            <section aria-label="Resultado da Batalha Sangrenta" className="flex flex-col gap-2.5">
              <div className="rounded-sm border-2 p-3 text-center flex flex-col gap-1" style={{ backgroundColor: colors.background.secondary, borderColor: venceu ? '#F3C769' : colors.status.danger }}>
                <div className="font-cinzel font-black text-2xl" style={{ color: venceu ? '#F3C769' : '#FF8A80' }}>{venceu ? 'Batalha vencida!' : 'Você foi derrotado'}</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>
                  {resposta.ondasVencidas} {resposta.ondasVencidas === 1 ? 'luta vencida' : 'lutas vencidas'}
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-sm font-cinzel font-bold mt-1" style={{ color: colors.text.primary }}>
                  {resposta.fragmentosAlma > 0 && <span style={{ color: '#C27BF0' }}>Fragmentos de alma +{resposta.fragmentosAlma}</span>}
                  {resposta.fragmentosSubclasse && <span style={{ color: '#C27BF0' }}>{nomeDaSubclasse(resposta.fragmentosSubclasse.subclasseId)} +{resposta.fragmentosSubclasse.quantidade}</span>}
                  <span style={{ color: '#F3C769' }}>Ouro +{resposta.ouro}</span>
                  {resposta.diamantes > 0 && <span style={{ color: '#5AA7F0' }}>Diamantes +{resposta.diamantes}</span>}
                </div>
                <div className="text-[11px] mt-1" style={{ color: colors.text.secondary }}>Tentativas restantes hoje: {resposta.tentativasRestantes}/{BATALHA_SANGRENTA.tentativasPorDia}</div>
              </div>
              <div className="rounded-sm border-2 p-2.5 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>
                <div className="font-cinzel font-bold text-sm" style={{ color: '#E6C775' }}>Lutas</div>
                {resposta.ondas.map((o, i) => (
                  <div key={`${o.monstroId}-${i}`} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-1 min-w-0">
                      {o.chefe && <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: '#F3C769' }} aria-label="Chefe" />}
                      <span className="truncate">{o.nome}</span>
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: o.vencedor === 'personagem' ? '#5FCB6A' : '#FF8A80' }}>
                      {o.vencedor === 'personagem' ? <>HP {Math.round(o.hpFinal)}</> : <><Skull className="w-3.5 h-3.5" /> Derrota</>}
                    </span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setEtapa({ tipo: 'dificuldades' })}
                className="py-2 rounded font-cinzel font-bold text-sm cursor-pointer" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                Voltar às dificuldades
              </button>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
