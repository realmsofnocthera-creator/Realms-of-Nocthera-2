'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Lock, Skull } from 'lucide-react';
import type { CharacterDocument, RespostaTorre } from '@/server/characterService';
import { estrelaDoAndar, montarMonstroDaTorre, TORRE } from '@/game/torreCelestial';
import { recompensasEmTexto, torreDoPersonagem } from '@/lib/torreTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { CombateCacada } from '@/components/cacada/CombateCacada';

interface TorreCelestialScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

type Etapa =
  | { tipo: 'torre' }
  | { tipo: 'combate'; antes: CharacterDocument; resposta: RespostaTorre }
  | { tipo: 'resultado'; antes: CharacterDocument; resposta: RespostaTorre };

const OURO = '#C8A656';

/**
 * Provação da Torre Celestial: o andar atual, o que ele dá, o próximo chefe e a luta (com o replay da Caçada).
 * Toda regra (nível, andar e recompensas) é conferida no servidor; a tela só mostra. Não dá para voltar andares.
 */
export function TorreCelestialScreen({ character, onCharacterChange, tokenFresco }: TorreCelestialScreenProps) {
  const { colors } = NOCTHERA_THEME;
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'torre' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const subir = async () => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error('Sessão expirada. Faça login de novo.');
      const combateId = `tor-${crypto.randomUUID()}`;
      const res = await fetch('/api/torre-celestial/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ combateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível subir a Torre.');
      setEtapa({ tipo: 'combate', antes: character, resposta: data as RespostaTorre });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao subir a Torre.');
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
    const monstro = montarMonstroDaTorre(resposta.torre.andar);
    return (
      <CombateCacada
        resultado={resposta.resultado}
        personagem={antes}
        monstro={monstro}
        titulo={`Torre Celestial · Andar ${resposta.torre.andar} · ${resposta.torre.nome}`}
        estrela={estrelaDoAndar(resposta.torre.andar)}
        onFim={terminarCombate}
      />
    );
  }

  const torre = torreDoPersonagem(character);
  const progresso = (torre.vencidos / TORRE.andares) * 100;

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 py-3 select-none" style={{ backgroundColor: colors.background.primary, backgroundImage: 'radial-gradient(ellipse at top, rgba(24,28,44,0.95) 0%, rgba(13,13,13,1) 75%)', color: colors.text.primary }}>
      <div className="w-full max-w-[480px] flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <Link href="/provacoes" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-cinzel font-bold uppercase" style={{ backgroundColor: colors.background.secondary, borderColor: OURO, color: '#E6C775' }}>
            <ArrowLeft className="w-4 h-4" /> Provações
          </Link>
          <span className="text-xs font-cinzel" style={{ color: colors.text.secondary }}>{character.nome} · Nv. {character.nivel}</span>
        </header>

        <h1 className="text-center text-2xl font-cinzel font-extrabold tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Torre Celestial</h1>

        {erro && (
          <div role="alert" className="rounded px-2 py-1.5 text-xs font-semibold" style={{ backgroundColor: colors.status.danger, color: colors.text.primary }}>{erro}</div>
        )}

        <section aria-label="Progresso na Torre" className="rounded-sm border px-3 py-2" style={{ backgroundColor: colors.background.secondary, borderColor: `${OURO}88` }}>
          <div className="flex items-center justify-between text-xs font-cinzel font-bold" style={{ color: '#E6C775' }}>
            <span>Andares vencidos</span>
            <span>{torre.vencidos} / {TORRE.andares}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-sm overflow-hidden" style={{ backgroundColor: '#1a1a22' }} role="progressbar" aria-valuemin={0} aria-valuemax={TORRE.andares} aria-valuenow={torre.vencidos}>
            <div className="h-full" style={{ width: `${progresso}%`, background: 'linear-gradient(90deg,#5AA7F0,#C27BF0)' }} />
          </div>
        </section>

        {etapa.tipo === 'torre' && torre.completa && (
          <section aria-label="Torre completa" className="rounded-sm border-2 p-4 text-center" style={{ backgroundColor: colors.background.secondary, borderColor: '#F3C769' }}>
            <div className="font-cinzel font-black text-xl" style={{ color: '#F3C769' }}>Você chegou ao topo da Torre Celestial!</div>
          </section>
        )}

        {etapa.tipo === 'torre' && !torre.completa && torre.andar !== null && (
          <section aria-label="Andar atual" className="rounded-sm border-2 p-3 flex flex-col gap-2" style={{ backgroundColor: colors.background.secondary, borderColor: torre.chefe ? '#F3C769' : OURO }}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-cinzel font-bold uppercase tracking-wider" style={{ color: colors.text.secondary }}>Andar {torre.andar}</div>
                <div className="font-cinzel font-black text-lg flex items-center gap-1.5" style={{ color: '#F3E6CC' }}>
                  {torre.chefe && <Crown className="w-4 h-4 shrink-0" style={{ color: '#F3C769' }} aria-label="Chefe" />}
                  <span>{torre.nome}</span>
                </div>
                {torre.efeitos && <div className="text-[11px]" style={{ color: '#C27BF0' }}>{torre.efeitos}</div>}
              </div>
              {torre.bloqueio ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-cinzel font-bold text-right" style={{ color: '#FF8A80' }}>
                  <Lock className="w-3 h-3 shrink-0" /> {torre.bloqueio}
                </span>
              ) : (
                <button type="button" disabled={ocupado} onClick={subir}
                  className="shrink-0 px-3 py-1.5 rounded font-cinzel font-bold text-xs cursor-pointer disabled:opacity-50 active:scale-95"
                  style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                  {ocupado ? '...' : 'Subir'}
                </button>
              )}
            </div>
            <div className="text-[12px] flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: colors.text.secondary }}>
              <span>Recompensas:</span>
              {torre.recompensas.length === 0
                ? <b style={{ color: colors.text.primary }}>nenhuma</b>
                : torre.recompensas.map((r) => <span key={r.rotulo}>{r.rotulo} <b style={{ color: colors.text.primary }}>+{r.valor}</b></span>)}
            </div>
            {torre.proximoChefe && !torre.chefe && (
              <div className="text-[11px]" style={{ color: colors.text.secondary }}>
                Próximo chefe: <b style={{ color: '#F3C769' }}>{torre.proximoChefe.nome}</b> no andar {torre.proximoChefe.andar} (faltam {torre.proximoChefe.faltam}).
              </div>
            )}
            <p className="text-[11px] leading-snug" style={{ color: colors.text.secondary }}>
              Um andar por vez, sem voltar. A Vida volta ao máximo a cada andar; se cair, você só perde a luta e pode tentar de novo.
            </p>
          </section>
        )}

        {etapa.tipo === 'resultado' && (() => {
          const { resposta, antes } = etapa;
          const t = resposta.torre;
          const proximo = t.proximoAndar;
          const ganhos = recompensasEmTexto(t.andar, antes.nivel).filter((r) => t.venceu && (
            (r.rotulo === 'XP' && t.xpGanho > 0) ||
            (r.rotulo === 'Essência de habilidade' && t.essenciaHabilidade > 0) ||
            (r.rotulo === 'Diamantes' && t.diamantes > 0) ||
            (r.rotulo === 'Fragmento de ascensão' && t.fragmentosAscensao > 0)
          )).map((r) => ({
            ...r,
            valor: r.rotulo === 'XP' ? t.xpGanho : r.rotulo === 'Essência de habilidade' ? t.essenciaHabilidade : r.rotulo === 'Diamantes' ? t.diamantes : t.fragmentosAscensao,
          }));
          return (
            <section aria-label="Resultado da Torre" className="flex flex-col gap-2.5">
              <div className="rounded-sm border-2 p-3 text-center flex flex-col gap-1" style={{ backgroundColor: colors.background.secondary, borderColor: t.venceu ? '#F3C769' : colors.status.danger }}>
                <div className="font-cinzel font-black text-2xl" style={{ color: t.venceu ? '#F3C769' : '#FF8A80' }}>{t.venceu ? `Andar ${t.andar} vencido!` : 'Você foi derrotado'}</div>
                <div className="text-sm flex items-center justify-center gap-1" style={{ color: colors.text.secondary }}>
                  {t.chefe && <Crown className="w-3.5 h-3.5" style={{ color: '#F3C769' }} />} {t.nome}
                </div>
                {t.venceu ? (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-sm font-cinzel font-bold mt-1" style={{ color: colors.text.primary }}>
                    {ganhos.map((g) => <span key={g.rotulo} style={{ color: g.rotulo === 'Diamantes' ? '#5AA7F0' : g.rotulo === 'XP' ? colors.text.primary : '#C27BF0' }}>{g.rotulo} +{g.valor}</span>)}
                  </div>
                ) : (
                  <div className="inline-flex items-center justify-center gap-1 text-sm mt-1" style={{ color: '#FF8A80' }}><Skull className="w-4 h-4" /> Nada foi perdido. Tente o andar {t.andar} de novo.</div>
                )}
                {resposta.levelUps > 0 && <div className="font-cinzel font-bold" style={{ color: '#5FCB6A' }}>Subiu para o nível {resposta.character.nivel}!</div>}
              </div>
              <button type="button" onClick={() => setEtapa({ tipo: 'torre' })}
                className="py-2 rounded font-cinzel font-bold text-sm cursor-pointer" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
                {proximo === null ? 'Voltar à Torre' : t.venceu ? `Seguir para o andar ${proximo}` : `Tentar o andar ${proximo} de novo`}
              </button>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
