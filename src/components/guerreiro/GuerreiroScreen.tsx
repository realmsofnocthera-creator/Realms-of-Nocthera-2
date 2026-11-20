'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import type { CharacterDocument, RespostaGuerreiro } from '@/server/characterService';
import { montarChefeGuerreiro } from '@/game/guerreiro';
import { dificuldadesDoGuerreiro, EMBLEMAS_POR_VITORIA, emblemasDoPersonagem } from '@/lib/guerreiroTela';
import { EMBLEMA_RARIDADE_MAP, EmblemaRaridade } from '@/rules/emblemas';
import { NOCTHERA_THEME } from '@/theme/theme';
import { CombateCacada } from '@/components/cacada/CombateCacada';
import { MesaDoGuerreiro } from './MesaDoGuerreiro';
import { ARENAS_DO_GUERREIRO } from '@/assets/arenasDoGuerreiro';
import { IconeDoEmblema } from '@/components/ficha/IconeDoEmblema';
import { TEXTOS_DO_GUERREIRO as T } from '@/rules/textosDoGuerreiro';

interface GuerreiroScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

type Etapa =
  | { tipo: 'dificuldades' }
  | { tipo: 'combate'; antes: CharacterDocument; resposta: RespostaGuerreiro }
  | { tipo: 'resultado'; antes: CharacterDocument; resposta: RespostaGuerreiro };

const OURO = '#C8A656';
const romano = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Provação do Guerreiro: 10 dificuldades, um chefe de mecânica única em cada, luta única e 1 tentativa por dia por
 * chefe. Vencer dá 4 emblemas. Toda regra é conferida no servidor; a tela só mostra.
 */
export function GuerreiroScreen({ character, onCharacterChange, tokenFresco }: GuerreiroScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'dificuldades' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<number | null>(null);

  const enfrentar = async (dificuldade: number) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error(T.sessaoExpirada);
      const combateId = `gue-${crypto.randomUUID()}`;
      const res = await fetch('/api/guerreiro/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dificuldade, combateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || T.falhaAoEnfrentar);
      setEtapa({ tipo: 'combate', antes: character, resposta: data as RespostaGuerreiro });
    } catch (e) {
      setErro(e instanceof Error ? e.message : T.erroAoEnfrentar);
    } finally {
      setOcupado(false);
    }
  };

  const terminarCombate = useCallback(() => {
    setEtapa((e) => {
      if (e.tipo !== 'combate') return e;
      onCharacterChange(e.resposta.character);
      return { tipo: 'resultado', antes: e.antes, resposta: e.resposta };
    });
  }, [onCharacterChange]);

  if (etapa.tipo === 'combate') {
    const { resposta, antes } = etapa;
    const g = resposta.guerreiro;
    return (
      <CombateCacada
        resultado={resposta.resultado}
        personagem={antes}
        monstro={montarChefeGuerreiro(g.dificuldade)}
        titulo={`Guerreiro · ${romano[g.dificuldade - 1]} · ${g.nome}`}
        estrela={Math.min(9, g.dificuldade)}
        mapa={ARENAS_DO_GUERREIRO[g.dificuldade]}
        onFim={terminarCombate}
      />
    );
  }

  const dificuldades = dificuldadesDoGuerreiro(character);
  const emblemas = emblemasDoPersonagem(character.emblemasItens);

  if (etapa.tipo === 'dificuldades') {
    const escolhida = dificuldades.find((d) => d.dificuldade === selecionada) ?? null;
    return (
      <main className="min-h-dvh w-full flex flex-col items-center select-none" style={{ backgroundColor: '#0d0a14', color: colors.text.primary }}>
        <div className="w-full max-w-[480px] flex flex-col">
          <MesaDoGuerreiro dificuldades={dificuldades} selecionada={selecionada} onSelecionar={(d) => { setErro(null); setSelecionada(d); }} onEnfrentar={enfrentar} ocupado={ocupado} />
          <div className="flex flex-col gap-2 px-2.5 py-3">
            {erro && (
              <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>
            )}
            {escolhida ? (
              <section aria-label={`${T.mecanica}: ${escolhida.mecanicaNome}`} className="rounded-sm border px-3 py-2 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}88` }}>
                <div className="text-[12px] leading-snug">
                  <b style={{ color: '#E6C775' }}>{escolhida.mecanicaNome}:</b> <span style={{ color: colors.text.secondary }}>{escolhida.mecanicaDescricao}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-[11px]" aria-label={T.chanceDosEmblemas}>
                  {escolhida.chances.map((c) => <span key={c.raridade} style={{ color: c.cor }}>{c.nome} {c.percentual}%</span>)}
                </div>
                {escolhida.aviso && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-cinzel font-bold" style={{ color: escolhida.estado === 'tentativaUsada' ? '#F3C769' : '#FF8A80' }}>
                    {escolhida.estado !== 'tentativaUsada' && <Lock className="w-3 h-3 shrink-0" />} {escolhida.aviso}
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-sm border px-3 py-2" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}88` }}>
                <p className="text-[11px] leading-snug" style={{ color: colors.text.secondary }}>{T.descricaoDaMesa} {T.regras(EMBLEMAS_POR_VITORIA)}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]" aria-label="Seus emblemas">
                  <span style={{ color: colors.text.secondary }}>{T.seusEmblemas}</span>
                  {emblemas.length === 0
                    ? <b style={{ color: colors.text.primary }}>{T.nenhum}</b>
                    : emblemas.map((e) => <span key={e.raridade} style={{ color: e.cor }}><b>{e.nome}</b> x{e.quantidade}</span>)}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(40,28,16,0.92) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => { setErro(null); setEtapa({ tipo: 'dificuldades' }); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase cursor-pointer" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Chefes
          </button>
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{character.nome} · Nv. {character.nivel}</span>
        </header>

        <h1 className="text-center text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>{T.titulo}</h1>

        {erro && (
          <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>
        )}

        {etapa.tipo === 'resultado' && (() => {
          const g = etapa.resposta.guerreiro;
          const ganhos = g.emblemas;
          return (
            <section aria-label="Resultado da Provação do Guerreiro" className="flex flex-col gap-2.5">
              <div className="rounded-sm border-2 p-3 text-center flex flex-col gap-1" style={{ backgroundColor: colors.background.secondary, borderColor: g.venceu ? '#F3C769' : colors.status.danger }}>
                <div className="font-cinzel font-black text-2xl" style={{ color: g.venceu ? '#F3C769' : '#FF8A80' }}>{g.venceu ? 'Chefe derrotado!' : 'Você foi derrotado'}</div>
                <div className="text-sm" style={{ color: colors.text.secondary }}>{g.nome} · {g.mecanicaNome}</div>
                {g.venceu ? (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-sm font-cinzel font-bold mt-1" aria-label="Emblemas ganhos">
                    {ganhos.map((e, i) => <span key={`${e.tipoId}-${i}`} className="inline-flex items-center gap-1" style={{ color: EMBLEMA_RARIDADE_MAP[e.raridade as EmblemaRaridade]?.cor }}><IconeDoEmblema tipo={e.tipoId} tamanho={32} className="w-8 h-8" />Emblema {e.nome} ({EMBLEMA_RARIDADE_MAP[e.raridade as EmblemaRaridade]?.nome})</span>)}
                  </div>
                ) : (
                  <div className="text-sm mt-1" style={{ color: '#FF8A80' }}>Sem emblemas desta vez. Tente de novo amanhã.</div>
                )}
                {g.primeiraVitoria && g.dificuldade < 10 && <div className="font-cinzel font-bold" style={{ color: '#5FCB6A' }}>A dificuldade {romano[g.dificuldade]} foi liberada!</div>}
              </div>
              <button type="button" onClick={() => setEtapa({ tipo: 'dificuldades' })}
                className="py-2 rounded font-cinzel font-bold text-sm cursor-pointer" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                Voltar aos chefes
              </button>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
