'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Hourglass, SkipForward } from 'lucide-react';
import { resolveAvatarSrc } from '@/assets/avatars';
import type { MapaDaCacada as MapaAnimado } from '@/assets/mapasDaCacada';
import { MapaDaCacada } from '@/components/cacada/MapaDaCacada';
import { AberturaDeBatalha } from '@/components/cena/AberturaDeBatalha';
import { SpriteAnimado } from '@/components/cena/SpriteAnimado';
import { BarraComRastro, BarraDoInimigo, ESTILOS_DA_LUTA, MOLDURA, NumeroFlutuante, Sombra, Status, geometriaDaCena, variacao } from '@/components/cacada/CombateCacada';
import { EfeitosDeStatus, FaixaDeHabilidade, FxPixelfx, ImpactoDaAcao } from '@/components/cacada/EfeitosDeLuta';
import { GOLPE_DO_MONSTRO, tintaDosStatus } from '@/assets/efeitosPixelfx';
import { ALTURA_DE_REFERENCIA_DA_ARTE, ANIMACAO_DO_MONSTRO, animacaoDoHeroi } from '@/lib/cacadaArte';
import { temposDoQuadro, tremeATela } from '@/lib/cacadaCoreografia';
import { larguraDasBarras, type PainelLuta } from '@/lib/cacadaReplay';
import { montarQuadrosEmGrupo } from '@/lib/cacadaReplayGrupo';
import { posicoesDaFormacao } from '@/lib/formacaoDoGrupo';
import { getClassById } from '@/rules/classes';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import type { AliadoDoReplay, ReplayDoTeste } from '@/rules/testeEquipe';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DO_COMBATE as T } from '@/rules/textosDoCombate';

/** Os nomes da especial e da suprema do aliado (a faixa com o nome só aparece nelas, não no ataque básico). */
function habilidadesDeVerdade(a: AliadoDoReplay): string[] {
  const classe = getClassById(a.classeId);
  const textos = a.subclasseAtualId ? TEXTOS_SUBCLASSE[a.subclasseAtualId] : undefined;
  return [classe?.progressao.habilidadeEspecial.nome, classe?.progressao.ultimate.nome, textos?.especial.nome, textos?.ultimate.nome].filter((n): n is string => !!n);
}

/** O painel pequeno de um aliado (retrato, vida e sobreescudo), embaixo da tela. */
function PainelDoAliado({ painel, aliado, agindo }: { painel: PainelLuta; aliado: AliadoDoReplay; agindo: boolean }) {
  const { vida } = larguraDasBarras({ ...painel, escudo: 0, escudoMax: 0 });
  const escudo = painel.escudoMax > 0 ? Math.min(100, (painel.escudo / painel.escudoMax) * 100) : 0;
  const caiu = painel.hp <= 0;
  return (
    <div className="flex-1 min-w-0 flex items-end gap-1" style={{ opacity: caiu ? 0.5 : 1 }} aria-label={`${painel.nome}, nível ${painel.nivel}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolveAvatarSrc(aliado.avatarId, aliado.classeId)} alt="" aria-hidden="true" className="w-9 h-11 shrink-0 object-cover border-2" style={{ borderColor: agindo ? '#F3C769' : '#C9B79A', filter: caiu ? 'grayscale(1)' : undefined }} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-cinzel font-bold text-[9px] leading-none truncate text-[#F3E6CC]" style={{ textShadow: '1px 1px 0 #000' }}>{painel.nome}</span>
        <div className="border" style={MOLDURA} role="meter" aria-valuemin={0} aria-valuemax={painel.hpMax} aria-valuenow={Math.round(painel.hp)} aria-label={textoDaFicha(T.vida, { hp: Math.round(painel.hp), max: painel.hpMax })}>
          <BarraComRastro vida={vida} altura={7} />
        </div>
        <div className="border overflow-hidden" style={{ ...MOLDURA, backgroundColor: '#101a2a' }} role="meter" aria-valuemin={0} aria-valuemax={painel.escudoMax} aria-valuenow={Math.round(painel.escudo)} aria-label={textoDaFicha(T.escudo, { n: Math.round(painel.escudo), max: painel.escudoMax })}>
          <div className="h-1" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)' }} />
        </div>
        {painel.status.length > 0 && <Status status={painel.status} />}
      </div>
    </div>
  );
}

/**
 * A luta em grupo do Teste de Equipe: os 2 ou 3 aliados em formação (um na frente e os outros atrás) contra o chefe, que fica maior
 * do que um monstro comum. A cada rodada cada aliado age e o chefe responde. O mesmo estilo da luta de um herói só: a investida, o
 * golpe no momento do impacto, os números, as barras e o tremor. Fica de fora a cena da suprema (ela atrasaria 3 jogadores).
 */
export function CombateEmGrupo({ replay, mapa, onFim }: { replay: ReplayDoTeste; mapa: MapaAnimado; onFim: () => void }) {
  const quadros = useMemo(() => montarQuadrosEmGrupo(replay), [replay]);
  const [indice, setIndice] = useState(0);
  const [abertura, setAbertura] = useState(true);
  const [rapido, setRapido] = useState(false);
  const [acertou, setAcertou] = useState(-1);
  const [terminou, setTerminou] = useState(false);
  const avisou = useRef(false);
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
  const heroisAnimados = useMemo(() => replay.aliados.map((a) => animacaoDoHeroi(a.classeId, a.subclasseAtualId)?.costas), [replay.aliados]);
  const animacaoChefe = ANIMACAO_DO_MONSTRO[replay.chefe.id];
  const velocidadeDoHeroi = (i: number) => { const h = heroisAnimados[i]; return h ? h.impacto / base.impacto : 1; };
  const velocidadeChefe = animacaoChefe ? animacaoChefe.impacto / base.impacto : 1;
  const duracaoDaAnimacao = (ms: readonly number[], velocidade: number) => Math.ceil(ms.reduce((a, b) => a + b, 0) / velocidade) + 90;
  const agindo = q.agiu;
  const duracaoDoAtaque =
    agindo?.lado === 'aliado' && heroisAnimados[agindo.i] ? duracaoDaAnimacao(heroisAnimados[agindo.i]!.ataque.ms, velocidadeDoHeroi(agindo.i))
    : agindo?.lado === 'chefe' && animacaoChefe ? duracaoDaAnimacao(animacaoChefe.ataque.ms, velocidadeChefe)
    : 0;
  const tempos = { impacto: base.impacto, duracao: acao ? Math.max(base.duracao, duracaoDoAtaque) : base.duracao };
  const impactou = !acao || acertou === indice;
  const vis = impactou || !ant ? q : ant;

  const avisarFim = () => {
    if (avisou.current) return;
    avisou.current = true;
    onFim();
  };
  useEffect(() => {
    if (abertura || terminou) return;
    const timers: number[] = [];
    if (acao) timers.push(window.setTimeout(() => setAcertou(indice), tempos.impacto));
    if (fim) {
      timers.push(window.setTimeout(() => setTerminou(true), tempos.duracao + (replay.venceu ? 600 : 900)));
    } else {
      timers.push(window.setTimeout(() => setIndice((i) => Math.min(quadros.length - 1, i + 1)), acao ? tempos.duracao : tempos.duracao * 0.5));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [abertura, terminou, indice, fim, rapido, acao, tempos.impacto, tempos.duracao, quadros.length, replay.venceu]);
  useEffect(() => {
    if (!terminou) return;
    const t = window.setTimeout(avisarFim, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminou]);

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

  const g = geometriaDaCena(caixa.w, caixa.h);
  // o chefe: maior do que um monstro comum, sem passar de 62% da largura da arena
  const alturaChefe = animacaoChefe ? Math.min(g.monstro.altura * (animacaoChefe.altura / ALTURA_DE_REFERENCIA_DA_ARTE) * 1.25, (caixa.w * 0.62) / animacaoChefe.proporcao) : g.monstro.altura;
  const larguraChefe = alturaChefe * (animacaoChefe?.proporcao ?? 1);
  const chefe = { x: Math.max(larguraChefe / 2 + 4, g.monstro.x * 0.9), pes: g.monstro.pes };
  // os heróis: cerca de 2/3 do tamanho de quando luta sozinho, para os 3 caberem; ninguém passa de 34% da largura
  const forma = posicoesDaFormacao(replay.aliados.length, caixa.w, caixa.h, g.jogador.x, g.jogador.pes);
  const herois = replay.aliados.map((a, i) => {
    const an = heroisAnimados[i];
    const pixel = an ? Math.min(g.jogador.altura * 0.0102 * 0.68, (caixa.w * 0.34) / an.largura) : 0;
    const altura = an ? an.altura * pixel : g.jogador.altura * 0.45;
    const largura = an ? an.largura * pixel : altura;
    const p = forma[i];
    return { a, an, altura, largura, x: Math.min(p.x, Math.max(largura / 2 + 4, caixa.w - largura / 2 - 4)), pes: p.pes };
  });

  const critico = !!acao && acao.criticos > 0;
  const golpeouAlvo = !!acao && !acao.bloqueado && acao.dano > 0;
  const alvoDoChefe = acao?.de === 'monstro' && agindo?.lado === 'chefe' ? agindo.alvo : -1;
  const reage = (quem: 'chefe' | number) => impactou && !!acao && (golpeouAlvo || acao.bloqueado) && (quem === 'chefe' ? acao.de === 'jogador' : alvoDoChefe === quem);
  const reacaoVars = (quem: 'chefe' | number): React.CSSProperties => {
    const sentido = quem === 'chefe' ? -1 : 1;
    const f = critico ? 2 : 1;
    return { ['--rx' as string]: `${sentido * 15 * f}px`, ['--ry' as string]: `${sentido * 8 * f}px`, animation: `cacadaReage ${critico ? 700 : 480}ms ease-out both` };
  };
  const mortoChefe = impactou && vis.chefe.hp <= 0;
  const alvoDaAcaoJogadorI = acao?.de === 'jogador' && agindo?.lado === 'aliado' ? agindo.i : -1;
  const alvoDoChefeDados = { x: chefe.x, pes: chefe.pes, altura: alturaChefe };
  const heroiComoAlvo = (i: number) => ({ x: herois[i].x, pes: herois[i].pes, altura: herois[i].altura * (herois[i].an ? 0.8 : 0.62) });
  const tremer = !!acao && impactou && golpeouAlvo && tremeATela(acao.dano, (acao.de === 'jogador' ? q.chefe.hpMax : q.aliados[Math.max(0, alvoDoChefe)]?.hpMax) || 1, critico);
  const sangrar = !!acao && impactou && acao.de === 'monstro' && golpeouAlvo;
  const habilidadeAcionada = acao?.de === 'jogador' && acao.habilidade && alvoDaAcaoJogadorI >= 0 && habilidadesDeVerdade(herois[alvoDaAcaoJogadorI].a).includes(acao.habilidade) ? acao.habilidade : undefined;
  const faixa = acao?.de === 'monstro' && acao.habilidade ? acao.habilidade : habilidadeAcionada;
  const ultimaLinha = q.linhas[q.linhas.length - 1]?.texto ?? '';
  const numerosSemAcao = !acao && ant ? { chefe: variacao(ant.chefe, q.chefe), aliados: q.aliados.map((p, i) => variacao(ant.aliados[i], p)) } : { chefe: 0, aliados: q.aliados.map(() => 0) };

  return (
    <div className="fixed inset-0 select-none overflow-hidden overscroll-none" style={{ backgroundColor: '#07050a', touchAction: 'none' }}>
      {abertura && <AberturaDeBatalha aoTerminar={() => setAbertura(false)} />}
      <style>{ESTILOS_DA_LUTA}</style>

      <div ref={arenaRef} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#0d1412' }}>
        <div key={`t-${indice}`} className="absolute inset-0" style={tremer ? { animation: `cacadaTremer ${critico ? 480 : 340}ms ease-out both`, ['--t' as string]: critico ? '9px' : '5px' } : undefined}>
          <MapaDaCacada estrela={0} mapa={mapa} style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo }} />

          <Sombra x={chefe.x} y={chefe.pes} largura={larguraChefe * 0.8} apagada={mortoChefe} />
          {herois.map((h, i) => <Sombra key={h.a.nome} x={h.x} y={h.pes} largura={h.largura * 0.55} apagada={impactou ? vis.aliados[i].hp <= 0 : false} />)}

          {/* o chefe */}
          <div className="absolute -translate-x-1/2" style={{ left: chefe.x, top: chefe.pes - alturaChefe, height: alturaChefe, aspectRatio: String(animacaoChefe?.proporcao ?? 1), zIndex: agindo?.lado === 'chefe' ? 90 : 4 }}>
            <div key={`ci-${indice}`} className="w-full h-full" style={agindo?.lado === 'chefe' ? { animation: `cacadaInvestida ${tempos.duracao}ms ease-in-out both`, ['--lx' as string]: `${(herois[agindo.alvo].x - chefe.x) * 0.52}px`, ['--ly' as string]: `${(herois[agindo.alvo].pes - chefe.pes) * 0.5}px` } : undefined}>
              <div key={`cr-${indice}`} className="w-full h-full" style={reage('chefe') ? reacaoVars('chefe') : undefined}>
                <div className={`w-full h-full ${mortoChefe ? 'cacada-morte' : ''}`}>
                  <div className={`w-full h-full ${q.chefe.enfurecido && vis.chefe.hp > 0 ? 'cacada-furia' : ''}`} style={{ filter: tintaDosStatus(vis.chefe.status), transition: 'filter 300ms' }}>
                    {animacaoChefe && <SpriteAnimado parado={animacaoChefe.parado} ataque={animacaoChefe.ataque} golpe={agindo?.lado === 'chefe' ? indice : null} velocidade={velocidadeChefe} espelhado rotulo={replay.chefe.nome} />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* os aliados, de costas, virados para o chefe (os de trás aparecem por baixo dos da frente) */}
          {herois.map((h, i) => {
            const agiu = agindo?.lado === 'aliado' && agindo.i === i;
            const morto = impactou && vis.aliados[i].hp <= 0;
            return (
              <div key={h.a.nome} className="absolute -translate-x-1/2" style={{ left: h.x, top: h.pes - h.altura, height: h.altura, aspectRatio: String(h.an ? h.an.proporcao : 1), zIndex: agiu ? 90 : Math.round(h.pes / 10) }}>
                <div key={`ji-${i}-${indice}`} className="w-full h-full" style={agiu ? { animation: `cacadaInvestida ${tempos.duracao}ms ease-in-out both`, ['--lx' as string]: `${(chefe.x - h.x) * 0.5}px`, ['--ly' as string]: `${(chefe.pes - h.pes) * 0.5}px` } : undefined}>
                  <div key={`jr-${i}-${indice}`} className="w-full h-full" style={reage(i) ? reacaoVars(i) : undefined}>
                    <div className={`w-full h-full ${morto ? 'cacada-morte-heroi' : ''}`} style={{ filter: tintaDosStatus(vis.aliados[i].status), transition: 'filter 300ms' }}>
                      {h.an ? (
                        <SpriteAnimado parado={h.an.parado} ataque={h.an.ataque} golpe={agiu ? indice : null} velocidade={velocidadeDoHeroi(i)} espelhado rotulo={h.a.nome} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveAvatarSrc(h.a.avatarId, h.a.classeId)} alt={h.a.nome} className="w-full h-full object-cover rounded-full" draggable={false} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* o impacto do golpe, no alvo */}
          {acao && impactou && agindo && (
            <ImpactoDaAcao
              key={`i-${indice}`}
              acao={acao}
              golpeDoMonstro={GOLPE_DO_MONSTRO[replay.chefe.id]}
              alvoVidaMaxima={(acao.de === 'jogador' ? q.chefe.hpMax : q.aliados[Math.max(0, alvoDoChefe)]?.hpMax) || 1}
              alvo={acao.de === 'jogador' ? alvoDoChefeDados : heroiComoAlvo(Math.max(0, alvoDoChefe))}
              alvoSi={acao.de === 'jogador' ? heroiComoAlvo(Math.max(0, alvoDaAcaoJogadorI)) : alvoDoChefeDados}
              topo={acao.de === 'jogador' ? chefe.pes - alturaChefe : herois[Math.max(0, alvoDoChefe)].pes - herois[Math.max(0, alvoDoChefe)].altura * 0.92}
              indice={indice}
              velocidade={rapido ? 1.8 : 1}
            />
          )}
          {!mortoChefe && <EfeitosDeStatus status={vis.chefe.status} alvo={alvoDoChefeDados} />}
          {herois.map((h, i) => (impactou && vis.aliados[i].hp <= 0 ? null : <EfeitosDeStatus key={h.a.nome} status={vis.aliados[i].status} alvo={heroiComoAlvo(i)} />))}
          {mortoChefe && <FxPixelfx key="morte" nome="morte" alvo={alvoDoChefeDados} atraso={450} velocidade={1} z={45} />}
          <NumeroFlutuante chave={`c-${indice}`} valor={numerosSemAcao.chefe} x={chefe.x} y={chefe.pes - alturaChefe} />
          {herois.map((h, i) => <NumeroFlutuante key={h.a.nome} chave={`a${i}-${indice}`} valor={numerosSemAcao.aliados[i]} x={h.x} y={h.pes - h.altura} />)}
        </div>

        {sangrar && <div key={`s-${indice}`} aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(190,10,20,.75) 100%)', animation: 'cacadaSangue 620ms ease-out both' }} />}
        {critico && impactou && <div key={`f-${indice}`} aria-hidden="true" className="absolute inset-0 pointer-events-none bg-white" style={{ animation: 'cacadaClarao 260ms ease-out both' }} />}
        {faixa && !abertura && !terminou && <FaixaDeHabilidade key={`h-${indice}`} nome={faixa} icone={null} heroi={acao?.de === 'jogador'} duracao={Math.round(tempos.duracao * 0.8)} />}
        {terminou && (
          <div role="status" className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(0,0,0,.45)', zIndex: 200 }}>
            <span className="font-cinzel font-black text-[34px] uppercase" style={{ color: replay.venceu ? '#F3C769' : '#FF9A8F', textShadow: '2px 2px 0 #000, -1px -1px 0 #000' }}>{replay.venceu ? 'Vitória!' : 'Derrota'}</span>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">{ultimaLinha}</p>

      {/* em cima à esquerda: a rodada e as opções */}
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

      {/* em cima à direita: a vida do chefe */}
      <div className="absolute right-2 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-20 w-[62%] max-w-[300px]">
        <BarraDoInimigo painel={vis.chefe} />
      </div>

      {/* embaixo: a vida de cada aliado */}
      <div className="absolute inset-x-2 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 flex gap-2">
        {replay.aliados.map((a, i) => <PainelDoAliado key={a.nome} painel={vis.aliados[i]} aliado={a} agindo={agindo?.lado === 'aliado' && agindo.i === i} />)}
      </div>
    </div>
  );
}
