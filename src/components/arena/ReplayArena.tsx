'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Hourglass, SkipForward } from 'lucide-react';
import { ARENAS_PVP, type ModoDoPvp } from '@/assets/arenasPvp';
import { resolveAvatarSrc } from '@/assets/avatars';
import { MapaDaCacada } from '@/components/cacada/MapaDaCacada';
import { AberturaDeBatalha } from '@/components/cena/AberturaDeBatalha';
import { SpriteAnimado } from '@/components/cena/SpriteAnimado';
import { BarraComRastro, ESTILOS_DA_LUTA, MOLDURA, NumeroFlutuante, Sombra, Status, geometriaDaCena, variacao } from '@/components/cacada/CombateCacada';
import { EfeitosDeStatus, FaixaDeHabilidade, FxPixelfx, ImpactoDaAcao } from '@/components/cacada/EfeitosDeLuta';
import { tintaDosStatus } from '@/assets/efeitosPixelfx';
import { animacaoDoHeroi } from '@/lib/cacadaArte';
import { temposDoQuadro, tremeATela } from '@/lib/cacadaCoreografia';
import { larguraDasBarras, type PainelLuta } from '@/lib/cacadaReplay';
import { quadrosDaArena } from '@/lib/arenaReplay';
import { CLASSES_MAP, getClassById } from '@/rules/classes';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DO_COMBATE as T } from '@/rules/textosDoCombate';
import type { LadoNaTela } from '@/server/arena';
import { useSonsDaLuta } from '@/lib/audio/useSonsDaLuta';

const OURO = '#C8A656';

/** O painel de um lutador (retrato, nome, vida, sobreescudo e status). */
function PainelDoLutador({ lado, painel, agindo, direita }: { lado: LadoNaTela; painel: PainelLuta; agindo: boolean; direita?: boolean }) {
  const { vida } = larguraDasBarras({ ...painel, escudo: 0, escudoMax: 0 });
  const escudo = painel.escudoMax > 0 ? Math.min(100, (painel.escudo / painel.escudoMax) * 100) : 0;
  return (
    <div className={`flex items-end gap-2 ${direita ? 'flex-row-reverse text-right' : ''}`} aria-label={`${lado.nome}, ${CLASSES_MAP[lado.classeId]?.nome ?? lado.classeId}, nível ${lado.nivel}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveAvatarSrc(lado.avatarId, lado.classeId)} alt="" aria-hidden="true" className="w-11 h-14 shrink-0 object-cover border-[3px]" style={{ borderColor: agindo ? '#F3C769' : '#C9B79A', boxShadow: '0 0 0 2px #2A1A12, 0 2px 8px rgba(0,0,0,.7)', filter: painel.hp <= 0 ? 'grayscale(1)' : undefined }} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-cinzel font-black text-[12px] leading-none truncate text-[#F3E6CC]" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>{lado.nome} <span className="text-[10px] font-bold text-[#C8A25A]">Nv {lado.nivel}</span></span>
        <div className="border-2" style={MOLDURA} role="meter" aria-valuemin={0} aria-valuemax={painel.hpMax} aria-valuenow={Math.round(painel.hp)} aria-label={textoDaFicha(T.vida, { hp: Math.round(painel.hp), max: painel.hpMax })}>
          <BarraComRastro vida={vida} altura={11} />
        </div>
        <div className="border overflow-hidden" style={{ ...MOLDURA, backgroundColor: '#101a2a' }} role="meter" aria-valuemin={0} aria-valuemax={painel.escudoMax} aria-valuenow={Math.round(painel.escudo)} aria-label={textoDaFicha(T.escudo, { n: Math.round(painel.escudo), max: painel.escudoMax })}>
          <div className="h-1.5" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)' }} />
        </div>
        {(painel.enfurecido || painel.status.length > 0) && <div className={direita ? 'self-end' : ''}><Status status={painel.status} enfurecido={painel.enfurecido} /></div>}
      </div>
    </div>
  );
}

/** Os nomes da especial e da suprema do lutador (a faixa com o nome só aparece nelas). */
function habilidadesDeVerdade(l: LadoNaTela): string[] {
  const classe = getClassById(l.classeId);
  const textos = l.subclasseId ? TEXTOS_SUBCLASSE[l.subclasseId] : undefined;
  return [classe?.progressao.habilidadeEspecial.nome, classe?.progressao.ultimate.nome, textos?.especial.nome, textos?.ultimate.nome].filter((n): n is string => !!n);
}

/**
 * O replay de uma luta da Arena, na arena animada do Yuri: quem atacou fica embaixo (de costas) e quem defendeu em cima (de frente), cada um com a
 * animação de ataque do herói, a investida, o golpe no momento do impacto, os números, as barras e o tremor, como nas outras lutas. Fim: o
 * resultado e o botão "Continuar".
 */
export function ReplayArena({ combate, lados, titulo, modo = 'arena', onFim }: { combate: import('@/game/combat').ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; titulo: string; modo?: ModoDoPvp; onFim: () => void }) {
  const quadros = useMemo(() => quadrosDaArena(combate, lados.a, lados.b), [combate, lados]);
  const [indice, setIndice] = useState(0);
  const [abertura, setAbertura] = useState(true);
  const [rapido, setRapido] = useState(false);
  const [acertou, setAcertou] = useState(-1);
  const [terminou, setTerminou] = useState(false);
  const fim = indice >= quadros.length - 1;
  const [caixa, setCaixa] = useState({ w: 390, h: 760 });
  const arenaRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = arenaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const medir = () => setCaixa((c) => (Math.abs(c.w - el.clientWidth) > 1 || Math.abs(c.h - el.clientHeight) > 1 ? { w: el.clientWidth, h: el.clientHeight } : c));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const q = quadros[indice];
  const ant = indice > 0 ? quadros[indice - 1] : null;
  const acao = q.acao;
  const base = temposDoQuadro(rapido, false);
  const anim = useMemo(() => ({ a: animacaoDoHeroi(lados.a.classeId, lados.a.subclasseId)?.costas, b: animacaoDoHeroi(lados.b.classeId, lados.b.subclasseId)?.frente }), [lados]);
  const velocidade = (l: 'a' | 'b') => (anim[l] ? anim[l]!.impacto / base.impacto : 1);
  const duracaoDoAtaque = q.agiu && anim[q.agiu] ? Math.ceil(anim[q.agiu]!.ataque.ms.reduce((x, y) => x + y, 0) / velocidade(q.agiu)) + 90 : 0;
  const tempos = { impacto: base.impacto, duracao: acao ? Math.max(base.duracao, duracaoDoAtaque) : base.duracao };
  const impactou = !acao || acertou === indice;
  useSonsDaLuta(acao, acertou, indice, true);
  const vis = impactou || !ant ? q : ant;

  useEffect(() => {
    if (abertura || terminou) return;
    const timers: number[] = [];
    if (acao) timers.push(window.setTimeout(() => setAcertou(indice), tempos.impacto));
    if (fim) timers.push(window.setTimeout(() => setTerminou(true), tempos.duracao + 600));
    else timers.push(window.setTimeout(() => setIndice((i) => Math.min(quadros.length - 1, i + 1)), acao ? tempos.duracao : tempos.duracao * 0.5));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [abertura, terminou, indice, fim, rapido, acao, tempos.impacto, tempos.duracao, quadros.length]);

  useEffect(() => {
    const html = document.documentElement;
    const antes = { overflow: document.body.style.overflow, overscroll: html.style.overscrollBehavior };
    document.body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = antes.overflow;
      html.style.overscrollBehavior = antes.overscroll;
    };
  }, []);

  // quem atacou (A) embaixo, à direita, de costas; quem defendeu (B) em cima, à esquerda, de frente
  const g = geometriaDaCena(caixa.w, caixa.h);
  const tamanho = (l: 'a' | 'b', fator: number) => {
    const an = anim[l];
    const pixel = an ? Math.min(g.jogador.altura * 0.0102 * fator, (caixa.w * 0.5) / an.largura) : 0;
    return { altura: an ? an.altura * pixel : g.jogador.altura * 0.6, largura: an ? an.largura * pixel : g.jogador.altura * 0.6 };
  };
  const ta = tamanho('a', 0.95);
  const tb = tamanho('b', 0.8);
  const pa = { x: Math.min(g.jogador.x, Math.max(ta.largura / 2 + 4, caixa.w - ta.largura / 2 - 4)), pes: g.jogador.pes };
  const pb = { x: Math.max(tb.largura / 2 + 4, g.monstro.x), pes: g.monstro.pes };
  const lugar = { a: { ...pa, ...ta }, b: { ...pb, ...tb } };
  const alvoDe = (l: 'a' | 'b') => ({ x: lugar[l].x, pes: lugar[l].pes, altura: lugar[l].altura * (anim[l] ? 0.8 : 0.62) });

  const critico = !!acao && acao.criticos > 0;
  const golpeouAlvo = !!acao && !acao.bloqueado && acao.dano > 0;
  const outro = q.agiu === 'a' ? 'b' : q.agiu === 'b' ? 'a' : null;
  const reage = (l: 'a' | 'b') => impactou && outro === l && !!acao && (golpeouAlvo || acao.bloqueado);
  const reacaoVars = (l: 'a' | 'b'): React.CSSProperties => {
    const sentido = l === 'b' ? -1 : 1;
    const f = critico ? 2 : 1;
    return { ['--rx' as string]: `${sentido * 15 * f}px`, ['--ry' as string]: `${sentido * 8 * f}px`, animation: `cacadaReage ${critico ? 700 : 480}ms ease-out both` };
  };
  const morto = (l: 'a' | 'b') => impactou && vis[l].hp <= 0;
  const tremer = !!acao && impactou && golpeouAlvo && outro && tremeATela(acao.dano, q[outro].hpMax || 1, critico);
  const sangrar = !!acao && impactou && golpeouAlvo && q.agiu === 'b';
  const faixa = acao?.habilidade && q.agiu && habilidadesDeVerdade(lados[q.agiu]).includes(acao.habilidade) ? acao.habilidade : null;
  const numeros = !acao && ant ? { a: variacao(ant.a, q.a), b: variacao(ant.b, q.b) } : { a: 0, b: 0 };
  const resultado = combate.vencedor === 'ninguem' ? 'Empate: os dois perdem' : `${combate.vencedor === 'a' ? lados.a.nome : lados.b.nome} venceu`;
  const ultimaLinha = q.linhas[q.linhas.length - 1] ?? '';

  const lutador = (l: 'a' | 'b') => {
    const { x, pes, altura } = lugar[l];
    const an = anim[l];
    const agiu = q.agiu === l;
    const alvoPos = lugar[l === 'a' ? 'b' : 'a'];
    return (
      <div key={l} className="absolute -translate-x-1/2" style={{ left: x, top: pes - altura, height: altura, aspectRatio: String(an ? an.proporcao : 1), zIndex: agiu ? 90 : Math.round(pes / 10) }}>
        <div key={`i-${l}-${indice}`} className="w-full h-full" style={agiu ? { animation: `cacadaInvestida ${tempos.duracao}ms ease-in-out both`, ['--lx' as string]: `${(alvoPos.x - x) * 0.5}px`, ['--ly' as string]: `${(alvoPos.pes - pes) * 0.5}px` } : undefined}>
          <div key={`r-${l}-${indice}`} className="w-full h-full" style={reage(l) ? reacaoVars(l) : undefined}>
            <div className={`w-full h-full ${morto(l) ? 'cacada-morte-heroi' : ''}`} style={{ filter: tintaDosStatus(vis[l].status), transition: 'filter 300ms' }}>
              {an ? (
                <SpriteAnimado parado={an.parado} ataque={an.ataque} golpe={agiu ? indice : null} velocidade={velocidade(l)} espelhado={l === 'a'} rotulo={lados[l].nome} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAvatarSrc(lados[l].avatarId, lados[l].classeId)} alt={lados[l].nome} className="w-full h-full object-cover rounded-full" draggable={false} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 select-none overflow-hidden overscroll-none" style={{ backgroundColor: '#07050a', touchAction: 'none' }} role="region" aria-label={titulo}>
      {abertura && <AberturaDeBatalha aoTerminar={() => setAbertura(false)} />}
      <style>{ESTILOS_DA_LUTA}</style>

      <div ref={arenaRef} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#0d1412' }}>
        <div key={`t-${indice}`} className="absolute inset-0" style={tremer ? { animation: `cacadaTremer ${critico ? 480 : 340}ms ease-out both`, ['--t' as string]: critico ? '9px' : '5px' } : undefined}>
          <MapaDaCacada estrela={0} mapa={ARENAS_PVP[modo]} style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo }} />
          <Sombra x={lugar.b.x} y={lugar.b.pes} largura={lugar.b.largura * 0.5} apagada={morto('b')} />
          <Sombra x={lugar.a.x} y={lugar.a.pes} largura={lugar.a.largura * 0.5} apagada={morto('a')} />
          {lutador('b')}
          {lutador('a')}
          {acao && impactou && q.agiu && outro && (
            <ImpactoDaAcao key={`i-${indice}`} acao={acao} alvoVidaMaxima={q[outro].hpMax || 1} alvo={alvoDe(outro)} alvoSi={alvoDe(q.agiu)} topo={lugar[outro].pes - lugar[outro].altura * 0.92} indice={indice} velocidade={rapido ? 1.8 : 1} />
          )}
          {(['a', 'b'] as const).map((l) => (morto(l) ? null : <EfeitosDeStatus key={l} status={vis[l].status} alvo={alvoDe(l)} />))}
          {(['a', 'b'] as const).map((l) => (morto(l) ? <FxPixelfx key={`m-${l}`} nome="morte" alvo={alvoDe(l)} atraso={450} velocidade={1} z={45} /> : null))}
          <NumeroFlutuante chave={`a-${indice}`} valor={numeros.a} x={lugar.a.x} y={lugar.a.pes - lugar.a.altura} />
          <NumeroFlutuante chave={`b-${indice}`} valor={numeros.b} x={lugar.b.x} y={lugar.b.pes - lugar.b.altura} />
        </div>
        {sangrar && <div key={`s-${indice}`} aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(190,10,20,.75) 100%)', animation: 'cacadaSangue 620ms ease-out both' }} />}
        {critico && impactou && <div key={`f-${indice}`} aria-hidden="true" className="absolute inset-0 pointer-events-none bg-white" style={{ animation: 'cacadaClarao 260ms ease-out both' }} />}
        {faixa && !abertura && !terminou && <FaixaDeHabilidade key={`h-${indice}`} nome={faixa} icone={null} heroi={q.agiu === 'a'} duracao={Math.round(tempos.duracao * 0.8)} />}
        {terminou && (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(0,0,0,.55)', zIndex: 200 }}>
            <span className="font-cinzel font-black text-[26px] uppercase text-center px-4" style={{ color: combate.vencedor === 'ninguem' ? OURO : '#F3C769', textShadow: '2px 2px 0 #000, -1px -1px 0 #000' }}>{resultado}</span>
            <button type="button" onClick={onFim} className="font-cinzel font-black uppercase px-6 py-2 border-2 cursor-pointer active:scale-95" style={{ ...MOLDURA, color: '#F3E6CC' }}>Continuar</button>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">{ultimaLinha}</p>

      <div className="absolute left-2 top-[max(8px,env(safe-area-inset-top))] z-20 flex items-center gap-1.5">
        <div className="h-10 pl-1.5 pr-3 flex items-center gap-1.5 border-2 font-cinzel font-black text-[18px] text-[#F3E6CC]" style={MOLDURA} aria-label={textoDaFicha(T.turno, { n: q.rodada })}>
          <Hourglass className="w-5 h-5" style={{ color: '#E9B872' }} aria-hidden="true" />
          {q.rodada}
        </div>
        <button type="button" onClick={() => setRapido((r) => !r)} aria-pressed={rapido} aria-label={rapido ? T.velocidadeNormal : T.velocidadeDobrada}
          className="w-10 h-10 flex flex-col items-center justify-center border-2 cursor-pointer active:scale-95" style={{ ...MOLDURA, color: rapido ? '#F3C769' : '#E9DCC8' }}>
          <FastForward className="w-4 h-4" aria-hidden="true" />
          <span className="text-[9px] font-black leading-none">2x</span>
        </button>
        <button type="button" onClick={() => setIndice(quadros.length - 1)} aria-label={T.pularParaOFim}
          className="w-10 h-10 flex items-center justify-center border-2 cursor-pointer active:scale-95" style={{ ...MOLDURA, color: '#E9DCC8' }}>
          <SkipForward className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <p className="absolute right-2 top-[max(14px,env(safe-area-inset-top))] z-20 max-w-[44%] text-right font-cinzel font-bold text-[11px] leading-tight text-[#F3E6CC]" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>{titulo}</p>

      {/* em cima, quem defendeu; embaixo, quem atacou */}
      <div className="absolute inset-x-2 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-20 max-w-[330px] ml-auto">
        <PainelDoLutador lado={lados.b} painel={vis.b} agindo={q.agiu === 'b'} direita />
      </div>
      <div className="absolute inset-x-2 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 max-w-[330px]">
        <PainelDoLutador lado={lados.a} painel={vis.a} agindo={q.agiu === 'a'} />
      </div>
    </div>
  );
}
