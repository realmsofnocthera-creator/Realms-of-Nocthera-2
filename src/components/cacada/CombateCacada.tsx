'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Droplet, FastForward, Flame, Ghost, Hourglass, Moon, Skull, SkipForward, Snowflake, Sparkles, Zap, Shield } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import type { ResultadoCombate } from '@/game/combat';
import type { MonsterDefinition } from '@/rules/monsters';
import type { EfeitoStatus } from '@/rules/statusEffects';
import { EFEITOS_STATUS } from '@/rules/statusEffects';
import { resolveAvatarSrc } from '@/assets/avatars';
import { MAPAS_DA_CACADA } from '@/assets/mapasDaCacada';
import { MapaDaCacada } from './MapaDaCacada';
import { AberturaDeBatalha } from '@/components/cena/AberturaDeBatalha';
import { TelaDeFimDeLuta, type TelaDeFimProps } from '@/components/cena/TelaDeFimDeLuta';
import { SpriteAnimado } from '@/components/cena/SpriteAnimado';
import { UltimateCinematica } from '@/components/cena/UltimateCinematica';
import { idDaUltimate, MODO_DA_ULTIMATE } from '@/assets/ultimates';
import { EfeitosDeStatus, FaixaDeHabilidade, FxPixelfx, ImpactoDaAcao, ImpactoDeCura } from './EfeitosDeLuta';
import { temposDoQuadro, tremeATela } from '@/lib/cacadaCoreografia';
import { tintaDosStatus } from '@/assets/efeitosPixelfx';
import { ALTURA_DE_REFERENCIA_DA_ARTE, ALTURA_MONSTRO_PADRAO, animacaoDoHeroi, SPRITE_CLASSE, SPRITE_MONSTRO } from '@/lib/cacadaArte';
import { larguraDasBarras, montarQuadros, PainelLuta, QuadroLuta } from '@/lib/cacadaReplay';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DO_COMBATE as T } from '@/rules/textosDoCombate';

interface CombateCacadaProps {
  resultado: ResultadoCombate;
  personagem: CharacterDocument;
  monstro: MonsterDefinition;
  titulo: string;
  /** estrela do monstro, para escolher o cenário */
  estrela?: number;
  /** HP com que o personagem entra na luta (Batalha Sangrenta). */
  hpInicialJogador?: number;
  /**
   * A luta acabou. Com `telaDeFim`, é chamado quando a tela de vitória/derrota aparece (a tela fica, com os botões); sem
   * ela, quando a tela de vitória/derrota termina sozinha.
   */
  onFim: () => void;
  /** O que a tela de vitória/derrota mostra (retrato, XP, ouro, espólios) e os botões de voltar e de repetir. */
  telaDeFim?: Omit<TelaDeFimProps, 'tipo'>;
}

const OURO = '#C8A656';
const FUNDO_PAINEL = 'rgba(14, 11, 14, 0.9)';

const ICONE_STATUS: Record<EfeitoStatus, { Icone: typeof Flame; cor: string }> = {
  sangramento: { Icone: Droplet, cor: '#E5484D' },
  veneno: { Icone: Skull, cor: '#7DCB55' },
  podridaoEscarlate: { Icone: Bug, cor: '#C0392B' },
  congelamento: { Icone: Snowflake, cor: '#7FD3F5' },
  sono: { Icone: Moon, cor: '#A6A6F5' },
  loucura: { Icone: Sparkles, cor: '#D07CF0' },
  maldicao: { Icone: Ghost, cor: '#9B6CF0' },
  paralisia: { Icone: Zap, cor: '#F5D547' },
  queimadura: { Icone: Flame, cor: '#F58A3C' },
};

/** Barra única: vermelha por baixo (vida) e azul por cima (Sobreescudo); a vida aparece conforme o escudo cai. */
export function BarraVidaEscudo({ painel, semTexto }: { painel: PainelLuta; /** sem os números por dentro (quando já aparecem por fora) */ semTexto?: boolean }) {
  const { vida, escudo } = larguraDasBarras(painel);
  return (
    <div className="relative h-4 rounded-sm overflow-hidden border" style={{ borderColor: '#000', backgroundColor: '#2a1214' }} role="group"
      aria-label={`Vida ${Math.round(painel.hp)} de ${painel.hpMax}${painel.escudo > 0 ? `, escudo ${Math.round(painel.escudo)}` : ''}`}>
      <div className="absolute inset-y-0 left-0 transition-all duration-200" style={{ width: `${vida}%`, background: 'linear-gradient(180deg,#E5484D,#9B1B22)' }} />
      {escudo > 0 && (
        <div className="absolute inset-y-0 left-0 transition-all duration-200" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)', opacity: 0.92 }} />
      )}
      {!semTexto && <div className="absolute inset-0 flex items-center justify-end gap-1.5 px-1.5 text-[10px] font-bold font-cinzel text-white" style={{ textShadow: '0 1px 2px #000' }}>
        {painel.escudo > 0 && <span style={{ color: '#BFE0FF' }}>+{Math.round(painel.escudo)}</span>}
        <span>{Math.round(painel.hp)} / {painel.hpMax}</span>
      </div>}
    </div>
  );
}

function Status({ status, enfurecido }: { status: EfeitoStatus[]; enfurecido?: boolean }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {enfurecido && (
        <span title={T.enfurecido} className="w-[19px] h-[19px] rounded-sm flex items-center justify-center border" style={{ backgroundColor: '#3a0d0d', borderColor: '#E5484D' }}>
          <Flame className="w-3 h-3" style={{ color: '#FF6B4A' }} aria-label={T.enfurecido} />
        </span>
      )}
      {status.map((s) => {
        const { Icone, cor } = ICONE_STATUS[s];
        return (
          <span key={s} title={EFEITOS_STATUS[s]?.nome ?? s} className="w-[19px] h-[19px] rounded-sm flex items-center justify-center border" style={{ backgroundColor: '#1a1416', borderColor: `${cor}99` }}>
            <Icone className="w-3 h-3" style={{ color: cor }} aria-label={EFEITOS_STATUS[s]?.nome ?? s} />
          </span>
        );
      })}
    </div>
  );
}

/** Destaca no log o dano (amarelo) e o nome dos status (na cor do status), como na referência. */
const NOME_PARA_STATUS = Object.entries(EFEITOS_STATUS).map(([id, e]) => ({ id: id as EfeitoStatus, nome: e.nome }));
const REGEX_DESTAQUE = new RegExp(`(\\d+)(?= de dano)|(${NOME_PARA_STATUS.map((n) => n.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

export function destacarLinha(texto: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(REGEX_DESTAQUE)) {
    const ini = m.index ?? 0;
    if (ini > ultimo) partes.push(texto.slice(ultimo, ini));
    if (m[1]) partes.push(<b key={ini} style={{ color: '#F3C769' }}>{m[1]}</b>);
    else {
      const st = NOME_PARA_STATUS.find((n) => n.nome === m[2]);
      partes.push(<b key={ini} style={{ color: st ? ICONE_STATUS[st.id].cor : undefined }}>{m[2]}</b>);
    }
    ultimo = ini + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/**
 * O mapa (1024 x 1536) cobre a tela inteira sem deformar: o monstro fica no chão, à esquerda e mais ao fundo (x 40%, pés a
 * 50% da altura), e o jogador à direita, mais perto (x 64%, pés a 80%), de costas e virado para o monstro, como na
 * referência do Yuri. As posições viram pixels, então nada sai do lugar em telas de tamanhos diferentes.
 */
const CENA = { w: 1024, h: 1536, topo: 0.28, base: 0.94, monstroX: 0.4, monstroPes: 0.5, jogadorX: 0.64, jogadorPes: 0.8, alturaMonstro: 0.15, alturaJogador: 0.26 };

export function geometriaDaCena(largura: number, altura: number) {
  const escala = Math.max(largura / CENA.w, altura / CENA.h);
  const imgW = CENA.w * escala;
  const imgH = CENA.h * escala;
  const esq = (imgW - largura) / 2;
  const meio = ((CENA.topo + CENA.base) / 2) * imgH;
  const topo = Math.min(Math.max(meio - altura / 2, 0), imgH - altura);
  return {
    imgW, imgH, esq, topo,
    monstro: { x: CENA.monstroX * imgW - esq, pes: CENA.monstroPes * imgH - topo, altura: CENA.alturaMonstro * imgH },
    jogador: { x: CENA.jogadorX * imgW - esq, pes: CENA.jogadorPes * imgH - topo, altura: CENA.alturaJogador * imgH },
  };
}

/**
 * Tela de combate (Caçada, Torre, Guerreiro, Batalha Sangrenta): reprodução automática da luta resolvida no servidor
 * (×1 / ×2). O mapa ocupa a tela inteira e a HUD fica por cima, como na referência do Yuri: turno e opções no alto à
 * esquerda, a vida do inimigo no alto à direita, o retrato com a vida e o sobreescudo embaixo à esquerda e as habilidades
 * (só os ícones e quantos ataques faltam) embaixo à direita. A tela não rola durante a luta.
 *
 * Cada ação é uma pequena coreografia: quem ataca se prepara, investe contra o alvo (o herói toca o ataque dele), o golpe
 * acerta e quem apanhou pisca, recua e treme, com o efeito do golpe (cor do elemento), faíscas, o número de dano grande
 * (um por golpe) e, no crítico, a estrela, o aviso e o tremor da tela. A barra de vida desce na hora do impacto e deixa um
 * rastro claro. No último golpe tudo vai em câmera lenta e a criatura se desfaz.
 */
export function CombateCacada({ resultado, personagem, monstro, titulo, estrela, hpInicialJogador, onFim, telaDeFim }: CombateCacadaProps) {
  const quadros: QuadroLuta[] = useMemo(() => montarQuadros(resultado, personagem, monstro, 5, hpInicialJogador), [resultado, personagem, monstro, hpInicialJogador]);
  const [indice, setIndice] = useState(0);
  // a abertura de batalha (a cena do Yuri) toca antes de a luta começar
  const [abertura, setAbertura] = useState(true);
  const [rapido, setRapido] = useState(false);
  // o quadro cujo golpe já acertou (a vida só desce, e os efeitos só aparecem, na hora do impacto)
  const [acertou, setAcertou] = useState(-1);
  // os quadros cuja cena da ultimate já tocou
  const [ultimatesTocadas, setUltimatesTocadas] = useState<number[]>([]);
  const fim = indice >= quadros.length - 1;
  const [caixa, setCaixa] = useState({ w: 390, h: 380 });
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
  const venceu = resultado.vencedor === 'personagem';
  const acao = q.acao;
  // o último golpe do herói é em câmera lenta
  const lenta = venceu && fim && acao?.de === 'jogador';
  // a ultimate do herói: a cena dela (vídeo do Yuri) toca antes do golpe, e a luta espera
  const ultimateAgora = acao?.de === 'jogador' ? q.habilidades.find((h) => h.ativandoAgora && h.espaco === 'ultimate') : undefined;
  const idUltimate = ultimateAgora ? idDaUltimate(ultimateAgora.nome) : undefined;
  const aguardandoUltimate = !!idUltimate && !ultimatesTocadas.includes(indice);
  const animacaoHeroi = animacaoDoHeroi(personagem.classeId, personagem.subclasseAtualId)?.costas;
  const base = temposDoQuadro(rapido, lenta);
  // o golpe do herói acerta no momento do impacto da animação dele, e o quadro dura até ela terminar
  const velocidadeHeroi = animacaoHeroi ? animacaoHeroi.impacto / base.impacto : 1;
  const duracaoDoAtaque = animacaoHeroi ? Math.ceil(animacaoHeroi.ataque.ms.reduce((a, b) => a + b, 0) / velocidadeHeroi) + 90 : 0;
  const tempos = { impacto: base.impacto, duracao: acao?.de === 'jogador' ? Math.max(base.duracao, duracaoDoAtaque) : base.duracao };
  const impactou = !acao || acertou === indice;
  // até o impacto, as barras ainda mostram a vida de antes do golpe
  const vis = impactou || !ant ? q : ant;
  const cameraLenta = lenta;

  const [telaFinal, setTelaFinal] = useState(false);
  const avisouFim = useRef(false);
  const avisarFim = useCallback(() => {
    if (avisouFim.current) return;
    avisouFim.current = true;
    onFim();
  }, [onFim]);

  useEffect(() => {
    if (abertura || telaFinal || aguardandoUltimate) return;
    const timers: number[] = [];
    if (acao) timers.push(window.setTimeout(() => setAcertou(indice), tempos.impacto));
    if (fim) {
      timers.push(window.setTimeout(() => {
        setTelaFinal(true);
        if (telaDeFim) avisarFim();
      }, tempos.duracao + (venceu ? 500 : 800)));
    } else {
      timers.push(window.setTimeout(() => setIndice((i) => Math.min(quadros.length - 1, i + 1)), acao ? tempos.duracao : tempos.duracao * 0.5));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [abertura, telaFinal, aguardandoUltimate, indice, fim, rapido, lenta, acao, tempos.impacto, tempos.duracao, quadros.length, venceu, telaDeFim, avisarFim]);

  // a tela não rola durante a luta (nem para cima nem para baixo)
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

  const spriteJogador = animacaoHeroi ? { src: animacaoHeroi.parado.src, proporcao: animacaoHeroi.proporcao } : SPRITE_CLASSE[personagem.classeId];
  const spriteMonstro = SPRITE_MONSTRO[monstro.id];
  const retrato = resolveAvatarSrc(personagem.avatarId, personagem.classeId);
  const g = geometriaDaCena(caixa.w, caixa.h);
  // a arte animada tem a mesma escala de pixel em todos os heróis: o tamanho na tela é o da arte vezes um fator (limitado para
  // o quadro, com a arma estendida, nunca passar de 80% da largura da tela)
  const pixelDoHeroi = animacaoHeroi ? Math.min((g.jogador.altura * 0.0102), (caixa.w * 0.8) / animacaoHeroi.largura) : 0;
  const alturaJogador = animacaoHeroi ? animacaoHeroi.altura * pixelDoHeroi : spriteJogador ? g.jogador.altura : g.jogador.altura * 0.7;
  // com arte: a altura segue a da arte (as criaturas das estrelas altas são maiores), sem passar de 46% da largura da arena
  const alturaMonstro = spriteMonstro
    ? Math.min(g.monstro.altura * (spriteMonstro.altura / ALTURA_DE_REFERENCIA_DA_ARTE), (caixa.w * 0.46) / spriteMonstro.proporcao)
    : g.monstro.altura * (ALTURA_MONSTRO_PADRAO / 22);
  const larguraJogador = alturaJogador * (spriteJogador?.proporcao ?? 1);
  const larguraMonstro = alturaMonstro * (spriteMonstro?.proporcao ?? 1);
  // o herói de quadro largo (arma estendida) se afasta da borda direita para não sair da tela
  const xJogador = Math.min(g.jogador.x, Math.max(larguraJogador / 2 + 4, caixa.w - larguraJogador / 2 - 4));

  // o centro de cada um e quanto cada um avança para golpear o outro
  // o alvo dos efeitos: o pé e a altura do corpo (no herói, a arte tem folga em volta, então o corpo é só uma parte do quadro)
  const alvoMonstro = { x: g.monstro.x, pes: g.monstro.pes, altura: alturaMonstro };
  const alvoJogador = { x: xJogador, pes: g.jogador.pes, altura: alturaJogador * (animacaoHeroi ? 0.8 : 0.62) };
  const investida = {
    jogador: { lx: (g.monstro.x - xJogador) * 0.5, ly: (g.monstro.pes - g.jogador.pes) * 0.5 },
    monstro: { lx: (xJogador - g.monstro.x) * 0.52, ly: (g.jogador.pes - g.monstro.pes) * 0.5 },
  };
  const critico = !!acao && acao.criticos > 0;
  const alvo = acao ? (acao.de === 'jogador' ? 'monstro' : 'jogador') : null;
  const golpeouAlvo = !!acao && !acao.bloqueado && acao.dano > 0;
  const reage = (quem: 'monstro' | 'jogador') => impactou && alvo === quem && !!acao && (golpeouAlvo || acao.bloqueado);
  const reacaoVars = (quem: 'monstro' | 'jogador'): React.CSSProperties => {
    const sentido = quem === 'monstro' ? -1 : 1;
    const f = critico ? 2 : 1;
    return { ['--rx' as string]: `${sentido * 15 * f}px`, ['--ry' as string]: `${sentido * 8 * f}px`, animation: `cacadaReage ${critico ? 700 : 480}ms ease-out both` };
  };
  const mortoMonstro = impactou && vis.monstro.hp <= 0;
  const mortoJogador = impactou && vis.jogador.hp <= 0;
  const tremer = !!acao && impactou && golpeouAlvo && tremeATela(acao.dano, (alvo === 'monstro' ? q.monstro.hpMax : q.jogador.hpMax) || 1, critico);
  const sangrar = !!acao && impactou && acao.de === 'monstro' && golpeouAlvo;
  // a faixa com o nome só aparece nas habilidades de verdade (a especial e a suprema), não no ataque básico
  const especial = acao?.de === 'jogador' ? q.habilidades.find((h) => h.ativandoAgora && (h.espaco === 'habilidadeEspecial' || h.espaco === 'ultimate')) : undefined;
  const faixa = acao?.de === 'monstro' && acao.habilidade ? { nome: acao.habilidade, icone: null } : especial ? { nome: especial.nome, icone: especial.icone } : null;
  const ultimaLinha = q.linhas[q.linhas.length - 1]?.texto ?? '';
  const comContagem = q.habilidades.filter((h) => !h.bloqueada && h.ticks !== null);
  // efeitos que não vêm de uma ação (veneno, sangramento, curas no fim da rodada): números menores, pela diferença de vida
  const numerosSemAcao = !acao && ant ? { monstro: variacao(ant.monstro, q.monstro), jogador: variacao(ant.jogador, q.jogador) } : { monstro: 0, jogador: 0 };
  const cura = acao && impactou && acao.cura > 0 ? acao : null;

  return (
    <div className="fixed inset-0 select-none overflow-hidden overscroll-none" style={{ backgroundColor: '#07050a', touchAction: 'none' }}>
      {abertura && <AberturaDeBatalha aoTerminar={() => setAbertura(false)} />}
      {aguardandoUltimate && !abertura && !telaFinal && idUltimate && (
        <UltimateCinematica key={`u-${indice}`} id={idUltimate} modo={MODO_DA_ULTIMATE} rapido={rapido} aoTerminar={() => setUltimatesTocadas((t) => [...t, indice])} />
      )}
      {telaFinal && (
        <TelaDeFimDeLuta
          tipo={venceu ? 'vitoria' : 'derrota'}
          {...telaDeFim}
          retrato={telaDeFim?.retrato ?? (venceu ? spriteMonstro?.src ?? retrato : retrato)}
          aoAcabar={telaDeFim ? telaDeFim.aoAcabar : avisarFim}
        />
      )}
      <style>{ESTILOS_DA_LUTA}</style>

      {/* o mapa ocupa a tela inteira, com a HUD por cima */}
      <div ref={arenaRef} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#0d1412' }}>
        {/* câmera lenta: aproxima do monstro no último golpe */}
        <div className="absolute inset-0" style={{ transform: cameraLenta ? 'scale(1.12)' : 'scale(1)', transformOrigin: `${g.monstro.x}px ${g.monstro.pes - alturaMonstro / 2}px`, transition: 'transform 900ms ease-in-out' }}>
          {/* o tremor da tela nos golpes fortes */}
          <div key={`t-${indice}`} className="absolute inset-0" style={tremer ? { animation: `cacadaTremer ${critico ? 480 : 340}ms ease-out both`, ['--t' as string]: critico ? '9px' : '5px' } : undefined}>
            {estrela && MAPAS_DA_CACADA[estrela] ? (
              <MapaDaCacada estrela={estrela} style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/landing-bg.webp" alt="" aria-hidden="true" draggable={false}
                className="absolute max-w-none" style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo, filter: 'brightness(0.4)', objectFit: 'cover' }} />
            )}

            {/* sombras no chão */}
            <Sombra x={g.monstro.x} y={g.monstro.pes} largura={larguraMonstro * 0.8} apagada={mortoMonstro} />
            <Sombra x={xJogador} y={g.jogador.pes} largura={larguraJogador * 0.55} apagada={mortoJogador} />

            {/* Monstro */}
            <div className="absolute -translate-x-1/2" style={{ left: g.monstro.x, top: g.monstro.pes - alturaMonstro, height: alturaMonstro, aspectRatio: spriteMonstro ? String(spriteMonstro.proporcao) : '1', zIndex: acao?.de === 'monstro' ? 6 : 4 }}>
              <div key={`mi-${indice}`} className="w-full h-full cacada-investida" style={acao?.de === 'monstro' ? { animation: `cacadaInvestida ${tempos.duracao}ms ease-in-out both`, ['--lx' as string]: `${investida.monstro.lx}px`, ['--ly' as string]: `${investida.monstro.ly}px` } : undefined}>
                <div key={`mr-${indice}`} className="w-full h-full" style={reage('monstro') ? reacaoVars('monstro') : undefined}>
                  <div className={`w-full h-full ${mortoMonstro ? 'cacada-morte' : ''}`} style={mortoMonstro ? { animationDuration: lenta ? '1500ms' : '1000ms' } : undefined}>
                    <div className={`w-full h-full ${vis.monstro.hp > 0 && !acao ? 'cacada-respira' : ''} ${q.monstro.enfurecido && vis.monstro.hp > 0 ? 'cacada-furia' : ''}`} style={{ filter: tintaDosStatus(vis.monstro.status), transition: 'filter 300ms' }}>
                      {spriteMonstro ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={spriteMonstro.src} alt={monstro.nome} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} draggable={false} />
                      ) : (
                        <div role="img" aria-label={monstro.nome} className="w-full h-full rounded-full flex items-center justify-center"
                          style={{ background: 'radial-gradient(circle at 50% 40%, rgba(25,12,20,0.95), rgba(0,0,0,0.85) 70%)', border: `2px solid ${OURO}55` }}>
                          <span className="font-cinzel font-black text-2xl" style={{ color: `${OURO}99` }}>?</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Jogador (de costas, virado para o monstro) */}
            <div className="absolute -translate-x-1/2" style={{ left: xJogador, top: g.jogador.pes - alturaJogador, height: alturaJogador, aspectRatio: spriteJogador ? String(spriteJogador.proporcao) : '1', zIndex: acao?.de === 'jogador' ? 6 : 5 }}>
              <div key={`ji-${indice}`} className="w-full h-full cacada-investida" style={acao?.de === 'jogador' ? { animation: `cacadaInvestida ${tempos.duracao}ms ease-in-out both`, ['--lx' as string]: `${investida.jogador.lx}px`, ['--ly' as string]: `${investida.jogador.ly}px` } : undefined}>
                <div key={`jr-${indice}`} className="w-full h-full" style={reage('jogador') ? reacaoVars('jogador') : undefined}>
                  <div className={`w-full h-full ${mortoJogador ? 'cacada-morte-heroi' : ''}`} style={{ filter: tintaDosStatus(vis.jogador.status), transition: 'filter 300ms' }}>
                    {animacaoHeroi ? (
                      <SpriteAnimado parado={animacaoHeroi.parado} ataque={animacaoHeroi.ataque} golpe={q.agiu === 'jogador' && !aguardandoUltimate ? indice : null} velocidade={velocidadeHeroi} espelhado rotulo={personagem.nome} />
                    ) : spriteJogador ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={spriteJogador.src} alt={personagem.nome} className="w-full h-full object-contain" style={{ transform: 'scaleX(-1)' }} draggable={false} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={retrato} alt={personagem.nome} className="w-full h-full object-cover rounded-full border-2" style={{ borderColor: `${OURO}88` }} draggable={false} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* o impacto: efeito de golpe, faíscas, números, avisos */}
            {acao && impactou && alvo && (
              <ImpactoDaAcao
                key={`i-${indice}`}
                acao={acao}
                alvoVidaMaxima={(alvo === 'monstro' ? q.monstro.hpMax : q.jogador.hpMax) || 1}
                alvo={alvo === 'monstro' ? alvoMonstro : alvoJogador}
                topo={alvo === 'monstro' ? g.monstro.pes - alturaMonstro : g.jogador.pes - alturaJogador * 0.92}
                indice={indice}
                velocidade={lenta ? 0.5 : rapido ? 1.8 : 1}
              />
            )}
            {cura && (
              <ImpactoDeCura
                key={`c-${indice}`}
                valor={cura.cura}
                alvo={cura.de === 'monstro' ? alvoMonstro : alvoJogador}
                topo={(cura.de === 'monstro' ? g.monstro.pes - alturaMonstro : g.jogador.pes - alturaJogador * 0.92) - 28}
              />
            )}
            {/* os efeitos que ficam sobre quem está sob status (veneno, sangramento, sono...) */}
            {!mortoMonstro && <EfeitosDeStatus status={vis.monstro.status} alvo={alvoMonstro} />}
            {!mortoJogador && <EfeitosDeStatus status={vis.jogador.status} alvo={alvoJogador} />}
            {/* a criatura se desfaz numa nuvem */}
            {mortoMonstro && <FxPixelfx key="morte" nome="morte" alvo={alvoMonstro} atraso={lenta ? 700 : 450} velocidade={lenta ? 0.6 : 1} z={25} />}
            <NumeroFlutuante chave={`m-${indice}`} valor={numerosSemAcao.monstro} x={g.monstro.x} y={g.monstro.pes - alturaMonstro} />
            <NumeroFlutuante chave={`j-${indice}`} valor={numerosSemAcao.jogador} x={xJogador} y={g.jogador.pes - alturaJogador} />
          </div>
        </div>

        {/* a borda escurece na câmera lenta */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 45% 45%, transparent 35%, rgba(0,0,0,.65) 100%)', opacity: cameraLenta ? 1 : 0, transition: 'opacity 700ms ease-in-out' }} />
        {/* quando o herói apanha, as bordas ficam vermelhas */}
        {sangrar && <div key={`s-${indice}`} aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 55%, transparent 40%, rgba(190,10,20,.75) 100%)', animation: 'cacadaSangue 620ms ease-out both' }} />}
        {/* o crítico dá um clarão curto */}
        {critico && impactou && <div key={`f-${indice}`} aria-hidden="true" className="absolute inset-0 pointer-events-none bg-white" style={{ animation: 'cacadaClarao 260ms ease-out both' }} />}
        {/* o nome da habilidade, no começo da ação */}
        {faixa && !abertura && !telaFinal && !aguardandoUltimate && <FaixaDeHabilidade key={`h-${indice}`} nome={faixa.nome} icone={faixa.icone} heroi={acao?.de === 'jogador'} duracao={Math.round(tempos.duracao * 0.8)} />}
      </div>

      {/* o que acontece, só para leitores de tela (a luta não tem mais log na tela) */}
      <p className="sr-only" aria-live="polite">{ultimaLinha}</p>

      {/* canto de cima à esquerda: o turno e as opções */}
      <div className="absolute left-2 top-[max(8px,env(safe-area-inset-top))] z-20 flex items-center gap-1.5">
        <div className="h-10 pl-1.5 pr-3 flex items-center gap-1.5 border-2 font-cinzel font-black text-[18px] text-[#F3E6CC]" style={MOLDURA} aria-label={textoDaFicha(T.turno, { n: q.turno })}>
          <Hourglass className="w-5 h-5" style={{ color: '#E9B872' }} aria-hidden="true" />
          {q.turno}
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

      {/* canto de cima à direita: a vida do inimigo */}
      <div className="absolute right-2 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-20 w-[62%] max-w-[300px]">
        <BarraDoInimigo painel={vis.monstro} />
      </div>

      {/* embaixo à esquerda: o retrato, a vida e o sobreescudo */}
      <div className="absolute left-2 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 w-[58%] max-w-[290px]">
        <PainelDoJogador painel={vis.jogador} retrato={retrato} />
      </div>

      {/* embaixo à direita: as habilidades e quantos ataques (ticks) faltam */}
      <div className="absolute right-2 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 flex items-end gap-1.5">
        {comContagem.map((h) => (
          <div key={h.espaco} className={`relative w-12 h-12 border-2 overflow-hidden ${h.ativandoAgora ? 'cacada-habilidade-ativa' : ''}`} title={textoDaFicha(T.habilidade, { nome: h.nome, texto: h.texto })}
            style={{ ...MOLDURA, borderColor: h.ativandoAgora ? '#F3C769' : MOLDURA.borderColor }}>
            {h.icone ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.icone} alt={h.nome} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1a1416]"><Shield className="w-5 h-5 text-[#8a7a5a]" aria-label={h.nome} /></div>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/70 font-cinzel font-black text-[12px] leading-[15px] text-white"
              aria-label={textoDaFicha(T.ticksAria, { n: h.ticks ?? 0 })}>
              <Hourglass className="w-3 h-3" style={{ color: '#E9B872' }} aria-hidden="true" />
              {h.ticks}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** As animações da luta. Os movimentos (investida, reação, tremor) respeitam "reduzir movimento"; os números e efeitos, não. */
const ESTILOS_DA_LUTA = `
@keyframes cacadaPfx{from{background-position:0% 0}to{background-position:100% 0}}
@keyframes cacadaNumG{0%{transform:translate(-50%,12px) scale(.4);opacity:0}10%{transform:translate(-50%,-4px) scale(1.4);opacity:1}24%{transform:translate(-50%,-10px) scale(1)}72%{transform:translate(-50%,-34px) scale(1);opacity:1}100%{transform:translate(-50%,-70px) scale(.95);opacity:0}}
.cacada-numero-grande{animation:cacadaNumG 1.15s ease-out both}
@keyframes cacadaNumC{0%{transform:translate(-50%,10px) scale(.3) rotate(-10deg);opacity:0}8%{transform:translate(-50%,-6px) scale(2.1) rotate(5deg);opacity:1}18%{transform:translate(-50%,-10px) scale(1.3) rotate(-4deg)}28%{transform:translate(-48%,-12px) scale(1.5) rotate(3deg)}38%{transform:translate(-52%,-14px) scale(1.35) rotate(-2deg)}70%{transform:translate(-50%,-34px) scale(1.4) rotate(0);opacity:1}100%{transform:translate(-50%,-80px) scale(1.2);opacity:0}}
.cacada-numero-critico{animation:cacadaNumC 1.5s ease-out both}
@keyframes cacadaRotulo{0%{transform:translate(-50%,6px) scale(.5);opacity:0}14%{transform:translate(-50%,0) scale(1.15);opacity:1}26%{transform:translate(-50%,0) scale(1)}74%{opacity:1}100%{transform:translate(-50%,-26px) scale(1);opacity:0}}
.cacada-rotulo{animation:cacadaRotulo 1.1s ease-out both}
@keyframes cacadaRotuloC{0%{transform:translate(-50%,0) scale(.4);opacity:0}10%{transform:translate(-50%,-4px) scale(1.5) rotate(-4deg);opacity:1}20%{transform:translate(-46%,-4px) scale(1.2) rotate(3deg)}30%{transform:translate(-54%,-4px) scale(1.3) rotate(-3deg)}40%{transform:translate(-50%,-4px) scale(1.2) rotate(0)}76%{opacity:1}100%{transform:translate(-50%,-30px) scale(1.1);opacity:0}}
.cacada-rotulo-critico{animation:cacadaRotuloC 1.35s ease-out both}
@keyframes cacadaFaixa{0%{opacity:0;transform:translate(-95%,0)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-8px)}}
.cacada-faixa{animation:cacadaFaixa var(--dur,900ms) ease-out both}
@keyframes cacadaSangue{0%{opacity:0}18%{opacity:1}100%{opacity:0}}
@keyframes cacadaClarao{0%{opacity:.3}100%{opacity:0}}
@keyframes cacadaNumero{0%{transform:translate(-50%,0) scale(.7);opacity:0}15%{transform:translate(-50%,-6px) scale(1.2);opacity:1}70%{opacity:1}100%{transform:translate(-50%,-48px) scale(1);opacity:0}}
.cacada-numero{animation:cacadaNumero .95s ease-out forwards}
@keyframes cacadaPulso{0%,100%{box-shadow:0 0 6px #F3C769}50%{box-shadow:0 0 16px #FFE9A0}}
.cacada-habilidade-ativa{animation:cacadaPulso .5s ease-in-out 2}
@media (prefers-reduced-motion: no-preference){
@keyframes cacadaInvestida{0%{transform:translate(0,0)}16%{transform:translate(calc(var(--lx)*-0.09),calc(var(--ly)*-0.09)) scale(.97,1.04)}38%{transform:translate(var(--lx),var(--ly)) scale(1.07,.95)}46%{transform:translate(var(--lx),var(--ly)) scale(1.02)}74%{transform:translate(0,0)}100%{transform:translate(0,0)}}
@keyframes cacadaReage{0%{transform:translate(0,0);filter:brightness(1)}6%{transform:translate(var(--rx),var(--ry));filter:brightness(3.4) saturate(0)}18%{transform:translate(calc(var(--rx)*1.25),calc(var(--ry)*1.25));filter:brightness(1.5) sepia(1) hue-rotate(-52deg) saturate(5)}38%{transform:translate(calc(var(--rx)*-.35),0);filter:brightness(1.15)}58%{transform:translate(calc(var(--rx)*.3),0)}80%{transform:translate(calc(var(--rx)*-.1),0);filter:brightness(1)}100%{transform:translate(0,0);filter:brightness(1)}}
@keyframes cacadaTremer{0%{transform:translate(0,0)}15%{transform:translate(var(--t),calc(var(--t)*-.6))}30%{transform:translate(calc(var(--t)*-1),calc(var(--t)*.5))}45%{transform:translate(calc(var(--t)*.7),calc(var(--t)*.4))}60%{transform:translate(calc(var(--t)*-.5),calc(var(--t)*-.3))}80%{transform:translate(calc(var(--t)*.2),0)}100%{transform:translate(0,0)}}
@keyframes cacadaMorte{0%{opacity:1;transform:translate(0,0) scale(1);filter:brightness(1)}14%{transform:translate(-7px,0) scale(1.05);filter:brightness(2.6) saturate(0)}28%{transform:translate(7px,0) scale(1.05)}46%{opacity:.85;filter:brightness(1.9) saturate(.3)}100%{opacity:0;transform:translate(0,16px) scale(.8,.45);filter:brightness(2.2) blur(2px)}}
.cacada-morte{animation:cacadaMorte 1000ms ease-in 350ms both}
@keyframes cacadaMorteHeroi{0%{opacity:1;transform:rotate(0)}30%{transform:rotate(-12deg) translate(-4%,2%)}100%{opacity:.45;transform:rotate(-82deg) translate(-20%,38%)}}
.cacada-morte-heroi{animation:cacadaMorteHeroi 900ms ease-in 300ms both;transform-origin:50% 90%}
@keyframes cacadaRespira{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-1.8%) scale(1.012,1.03)}}
.cacada-respira{animation:cacadaRespira 2.4s ease-in-out infinite;transform-origin:50% 100%}
@keyframes cacadaFuria{0%,100%{filter:drop-shadow(0 0 4px rgba(255,50,30,.55))}50%{filter:drop-shadow(0 0 12px rgba(255,70,40,.95)) brightness(1.1)}}
.cacada-furia{animation:cacadaFuria 1s ease-in-out infinite}
}`;

/** A sombra no chão, embaixo de quem luta. */
function Sombra({ x, y, largura, apagada }: { x: number; y: number; largura: number; apagada: boolean }) {
  return (
    <span aria-hidden="true" className="absolute pointer-events-none rounded-[50%]"
      style={{ left: x - largura / 2, top: y - largura * 0.09, width: largura, height: largura * 0.2, background: 'radial-gradient(ellipse at center, rgba(0,0,0,.55), rgba(0,0,0,0) 70%)', opacity: apagada ? 0 : 1, transition: 'opacity 600ms', zIndex: 3 }} />
  );
}

/** A moldura escura dos botões e caixas da HUD (vermelho-sangue, como na referência). */
const MOLDURA: React.CSSProperties = { backgroundColor: 'rgba(20, 8, 10, 0.86)', borderColor: '#6B1F1F', boxShadow: 'inset 0 0 0 1px #2A0A0C, 0 2px 6px rgba(0,0,0,.6)' };

/** Quanto a vida + escudo mudou de um quadro para o outro (negativo = dano, positivo = cura). */
function variacao(antes: PainelLuta, agora: PainelLuta): number {
  return Math.round(agora.hp + agora.escudo - (antes.hp + antes.escudo));
}

/** O número pequeno de efeitos sem golpe (veneno, sangramento, cura no fim da rodada): dano em amarelo, cura em verde. */
function NumeroFlutuante({ chave, valor, x, y }: { chave: string; valor: number; x: number; y: number }) {
  if (!valor) return null;
  const dano = valor < 0;
  return (
    <span key={chave} className="cacada-numero absolute z-30 pointer-events-none font-cinzel font-black text-[26px] leading-none"
      aria-label={textoDaFicha(dano ? T.dano : T.cura, { n: Math.abs(valor) })}
      style={{ left: x, top: y - 6, color: dano ? '#FFD45C' : '#7CF07C', textShadow: '2px 2px 0 #3A0606, -1px -1px 0 #3A0606, 1px -1px 0 #3A0606, -1px 1px 0 #3A0606' }}>
      {dano ? `-${Math.abs(valor)}` : `+${valor}`}
    </span>
  );
}

/** A barra de vida com o rastro claro: quando a vida cai, o rastro desce devagar e mostra o quanto foi tirado. */
function BarraComRastro({ vida, escudo, altura, trilha = true }: { vida: number; escudo?: number; altura: number; trilha?: boolean }) {
  return (
    <div className="relative overflow-hidden" style={{ height: altura, backgroundColor: '#2a1214' }}>
      {trilha && <div className="absolute inset-y-0 left-0" style={{ width: `${vida}%`, background: '#F3D58A', transition: 'width 750ms ease-out 420ms' }} />}
      <div className="absolute inset-y-0 left-0" style={{ width: `${vida}%`, background: 'linear-gradient(180deg,#E5484D,#9B1B22)', transition: 'width 140ms ease-out' }} />
      {!!escudo && <div className="absolute inset-y-0 left-0" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)', opacity: 0.92, transition: 'width 140ms ease-out' }} />}
    </div>
  );
}

/** A vida do inimigo: o crânio num losango, a barra (vida e escudo) e os números por cima; os efeitos ficam embaixo. */
function BarraDoInimigo({ painel }: { painel: PainelLuta }) {
  const { vida, escudo } = larguraDasBarras(painel);
  return (
    <div className="flex flex-col items-end gap-1" role="group" aria-label={textoDaFicha(T.inimigo, { nome: painel.nome, n: painel.nivel })}>
      <div className="flex items-baseline gap-2 font-cinzel text-[#F3E6CC]" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>
        <span className="text-[11px] font-bold truncate max-w-[150px]">{painel.nome}</span>
        <span className="text-[14px] font-black">{painel.escudo > 0 && <span className="text-[#BFE0FF] mr-1">+{Math.round(painel.escudo)}</span>}{Math.round(painel.hp)}/{painel.hpMax}</span>
      </div>
      <div className="flex items-center w-full">
        <span className="relative z-10 -mr-2 w-9 h-9 shrink-0 rotate-45 border-2 flex items-center justify-center" style={MOLDURA}>
          <Skull className="w-5 h-5 -rotate-45 text-[#F3E6CC]" aria-hidden="true" />
        </span>
        <div className="flex-1 border-2 p-[2px]" style={MOLDURA}>
          <div role="meter" aria-valuemin={0} aria-valuemax={painel.hpMax} aria-valuenow={Math.round(painel.hp)} aria-label={textoDaFicha(T.vida, { hp: Math.round(painel.hp), max: painel.hpMax })}>
            <BarraComRastro vida={vida} escudo={escudo} altura={16} />
          </div>
        </div>
      </div>
      {(painel.enfurecido || painel.status.length > 0) && <Status status={painel.status} enfurecido={painel.enfurecido} />}
    </div>
  );
}

/** O jogador: o retrato, a barra de vida (HP) e a de sobreescudo (com o nível no losango); os efeitos ficam embaixo. */
function PainelDoJogador({ painel, retrato }: { painel: PainelLuta; retrato: string }) {
  const { vida } = larguraDasBarras({ ...painel, escudo: 0, escudoMax: 0 });
  const escudo = painel.escudoMax > 0 ? Math.min(100, (painel.escudo / painel.escudoMax) * 100) : 0;
  return (
    <div className="flex items-end gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={retrato} alt="" aria-hidden="true" className="w-[64px] h-[76px] shrink-0 object-cover border-[3px]" style={{ borderColor: '#C9B79A', boxShadow: '0 0 0 2px #2A1A12, 0 2px 8px rgba(0,0,0,.7)' }} />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-end justify-between font-cinzel text-[#F3E6CC] leading-none" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000' }}>
          <span className="text-[20px] font-black">{T.hp}</span>
          <span className="text-[13px] font-black">{Math.round(painel.hp)}/{painel.hpMax}</span>
        </div>
        <div className="border-2" style={MOLDURA} role="meter" aria-valuemin={0} aria-valuemax={painel.hpMax} aria-valuenow={Math.round(painel.hp)} aria-label={textoDaFicha(T.vida, { hp: Math.round(painel.hp), max: painel.hpMax })}>
          <BarraComRastro vida={vida} altura={12} />
        </div>
        <div className="flex items-center">
          <span className="relative z-10 -mr-1.5 w-6 h-6 shrink-0 rotate-45 border-2 flex items-center justify-center" style={{ ...MOLDURA, backgroundColor: '#1F4F8F', borderColor: '#BFE0FF' }} aria-label={textoDaFicha(T.nivel, { n: painel.nivel })}>
            <span className="-rotate-45 font-cinzel font-black text-[10px] text-white">{painel.nivel}</span>
          </span>
          <div className="flex-1 border-2 overflow-hidden" style={{ ...MOLDURA, backgroundColor: '#101a2a' }} role="meter" aria-valuemin={0} aria-valuemax={painel.escudoMax} aria-valuenow={Math.round(painel.escudo)} aria-label={textoDaFicha(T.escudo, { n: Math.round(painel.escudo), max: painel.escudoMax })}>
            <div className="h-2.5 transition-all duration-200" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)' }} />
          </div>
        </div>
        {(painel.enfurecido || painel.status.length > 0) && <Status status={painel.status} enfurecido={painel.enfurecido} />}
      </div>
    </div>
  );
}
