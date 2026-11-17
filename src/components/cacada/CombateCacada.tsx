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
import { ALTURA_DE_REFERENCIA_DA_ARTE, ALTURA_MONSTRO_PADRAO, ANIMACAO_DO_HEROI, SPRITE_CLASSE, SPRITE_MONSTRO } from '@/lib/cacadaArte';
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
 * (só os ícones e quantos ataques faltam) embaixo à direita. O dano sobe flutuando perto de quem apanhou, os efeitos
 * (DoTs, debuffs, enfurecido) ficam embaixo de cada barra e a tela não rola durante a luta. Não há mais log na tela.
 */
export function CombateCacada({ resultado, personagem, monstro, titulo, estrela, hpInicialJogador, onFim, telaDeFim }: CombateCacadaProps) {
  const quadros: QuadroLuta[] = useMemo(() => montarQuadros(resultado, personagem, monstro, 5, hpInicialJogador), [resultado, personagem, monstro, hpInicialJogador]);
  const [indice, setIndice] = useState(0);
  // a abertura de batalha (a cena do Yuri) toca antes de a luta começar
  const [abertura, setAbertura] = useState(true);
  const [rapido, setRapido] = useState(false);
  const [tremor, setTremor] = useState<{ monstro: number; jogador: number }>({ monstro: 0, jogador: 0 });
  const anterior = useRef<QuadroLuta | null>(null);
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

  const venceu = resultado.vencedor === 'personagem';
  // o último golpe do herói é em câmera lenta: a câmera aproxima um pouco antes e o golpe dura mais
  const cameraLenta = venceu && !abertura && quadros.length > 1 && indice >= quadros.length - 2;
  const [telaFinal, setTelaFinal] = useState(false);
  const avisouFim = useRef(false);
  const avisarFim = useCallback(() => {
    if (avisouFim.current) return;
    avisouFim.current = true;
    onFim();
  }, [onFim]);

  useEffect(() => {
    if (abertura || telaFinal) return;
    if (fim) {
      const t = setTimeout(() => {
        setTelaFinal(true);
        if (telaDeFim) avisarFim();
      }, venceu ? 1900 : 1100);
      return () => clearTimeout(t);
    }
    const passo = rapido ? 450 : 900;
    const ultimoGolpe = venceu && indice === quadros.length - 2;
    const t = setTimeout(() => setIndice((i) => Math.min(quadros.length - 1, i + 1)), ultimoGolpe ? passo + 900 : passo);
    return () => clearTimeout(t);
  }, [abertura, telaFinal, indice, fim, rapido, quadros.length, venceu, telaDeFim, avisarFim]);

  const q = quadros[indice];

  // Quem perdeu vida neste quadro treme e pisca
  useEffect(() => {
    const ant = anterior.current;
    if (ant && ant !== q) {
      setTremor((t) => ({
        monstro: q.monstro.hp < ant.monstro.hp ? t.monstro + 1 : t.monstro,
        jogador: q.jogador.hp < ant.jogador.hp ? t.jogador + 1 : t.jogador,
      }));
    }
    anterior.current = q;
  }, [q]);

  const animacaoHeroi = ANIMACAO_DO_HEROI[personagem.classeId]?.costas;
  const spriteJogador = animacaoHeroi ? { src: animacaoHeroi.parado.src, proporcao: animacaoHeroi.proporcao } : SPRITE_CLASSE[personagem.classeId];
  const spriteMonstro = SPRITE_MONSTRO[monstro.id];
  const retrato = resolveAvatarSrc(personagem.avatarId, personagem.classeId);
  const g = geometriaDaCena(caixa.w, caixa.h);
  // a arte animada vem num quadro com folga em volta do personagem: o quadro é maior para o herói ficar do tamanho de antes
  const alturaJogador = animacaoHeroi ? g.jogador.altura * 1.45 : spriteJogador ? g.jogador.altura : g.jogador.altura * 0.7;
  // com arte: a altura segue a da arte (as criaturas das estrelas altas são maiores), sem passar de 46% da largura da arena
  const alturaMonstro = spriteMonstro
    ? Math.min(g.monstro.altura * (spriteMonstro.altura / ALTURA_DE_REFERENCIA_DA_ARTE), (caixa.w * 0.46) / spriteMonstro.proporcao)
    : g.monstro.altura * (ALTURA_MONSTRO_PADRAO / 22);

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

  // o dano (e a cura) de cada quadro sobe flutuando perto de quem recebeu
  const ant = indice > 0 ? quadros[indice - 1] : null;
  const numeros = ant ? { monstro: variacao(ant.monstro, q.monstro), jogador: variacao(ant.jogador, q.jogador) } : { monstro: 0, jogador: 0 };
  const ultimaLinha = q.linhas[q.linhas.length - 1]?.texto ?? '';
  const comContagem = q.habilidades.filter((h) => !h.bloqueada && h.ticks !== null);

  return (
    <div className="fixed inset-0 select-none overflow-hidden overscroll-none" style={{ backgroundColor: '#07050a', touchAction: 'none' }}>
      {abertura && <AberturaDeBatalha aoTerminar={() => setAbertura(false)} />}
      {telaFinal && (
        <TelaDeFimDeLuta
          tipo={venceu ? 'vitoria' : 'derrota'}
          {...telaDeFim}
          retrato={telaDeFim?.retrato ?? (venceu ? spriteMonstro?.src ?? retrato : retrato)}
          aoAcabar={telaDeFim ? telaDeFim.aoAcabar : avisarFim}
        />
      )}
      <style>{`@media (prefers-reduced-motion: no-preference){@keyframes cacadaGolpe{0%{transform:translateX(0);filter:brightness(1)}20%{transform:translateX(-5px);filter:brightness(2.2) saturate(.3)}45%{transform:translateX(5px)}70%{transform:translateX(-2px)}100%{transform:translateX(0);filter:brightness(1)}}.cacada-golpe{animation:cacadaGolpe .35s ease-out}}
@keyframes cacadaLento{0%{transform:translateX(0);filter:brightness(1)}15%{transform:translateX(-7px);filter:brightness(2.6) saturate(.2)}40%{transform:translateX(7px)}65%{transform:translateX(-3px)}100%{transform:translateX(0);filter:brightness(1)}}.cacada-golpe-lento{animation:cacadaLento 1.3s ease-out}
@keyframes cacadaNumeroLento{0%{transform:translate(-50%,0) scale(.6);opacity:0}20%{transform:translate(-50%,-10px) scale(1.6);opacity:1}75%{opacity:1}100%{transform:translate(-50%,-60px) scale(1.4);opacity:0}}.cacada-numero-lento{animation:cacadaNumeroLento 2.1s ease-out forwards}
@keyframes cacadaNumero{0%{transform:translate(-50%,0) scale(.7);opacity:0}15%{transform:translate(-50%,-6px) scale(1.15);opacity:1}70%{opacity:1}100%{transform:translate(-50%,-42px) scale(1);opacity:0}}.cacada-numero{animation:cacadaNumero .9s ease-out forwards}`}</style>

      {/* o mapa ocupa a tela inteira, com a HUD por cima */}
      <div ref={arenaRef} className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#0d1412' }}>
        {/* câmera lenta: aproxima do monstro e escurece em volta, no último golpe */}
        <div className="absolute inset-0" style={{ transform: cameraLenta ? 'scale(1.12)' : 'scale(1)', transformOrigin: `${g.monstro.x}px ${g.monstro.pes - alturaMonstro / 2}px`, transition: 'transform 900ms ease-in-out' }}>
        {estrela && MAPAS_DA_CACADA[estrela] ? (
          <MapaDaCacada estrela={estrela} style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/images/landing-bg.webp" alt="" aria-hidden="true" draggable={false}
            className="absolute max-w-none" style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo, filter: 'brightness(0.4)', objectFit: 'cover' }} />
        )}

        {/* Monstro */}
        <div className="absolute -translate-x-1/2" style={{ left: g.monstro.x, top: g.monstro.pes - alturaMonstro, height: alturaMonstro,
          aspectRatio: spriteMonstro ? String(spriteMonstro.proporcao) : '1', opacity: q.monstro.hp > 0 ? 1 : 0.2, transition: 'opacity 0.6s' }}>
          <div key={tremor.monstro} className={tremor.monstro > 0 ? `${cameraLenta && fim ? 'cacada-golpe-lento' : 'cacada-golpe'} w-full h-full` : 'w-full h-full'}>
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
        <NumeroFlutuante chave={`m-${indice}`} valor={numeros.monstro} x={g.monstro.x} y={g.monstro.pes - alturaMonstro} lento={cameraLenta && fim} />

        {/* Jogador (de costas, virado para o monstro) */}
        <div className="absolute -translate-x-1/2" style={{ left: g.jogador.x, top: g.jogador.pes - alturaJogador, height: alturaJogador,
          aspectRatio: spriteJogador ? String(spriteJogador.proporcao) : '1', opacity: q.jogador.hp > 0 ? 1 : 0.3, transition: 'opacity 0.6s' }}>
          <div key={tremor.jogador} className={tremor.jogador > 0 ? 'cacada-golpe w-full h-full' : 'w-full h-full'}>
            {animacaoHeroi ? (
              <SpriteAnimado parado={animacaoHeroi.parado} ataque={animacaoHeroi.ataque} golpe={q.agiu === 'jogador' ? indice : null} velocidade={rapido ? 2 : cameraLenta && fim ? 0.5 : 1} espelhado rotulo={personagem.nome} />
            ) : spriteJogador ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={spriteJogador.src} alt={personagem.nome} className="w-full h-full object-contain" style={{ transform: 'scaleX(-1)' }} draggable={false} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={retrato} alt={personagem.nome} className="w-full h-full object-cover rounded-full border-2" style={{ borderColor: `${OURO}88` }} draggable={false} />
            )}
          </div>
        </div>
        <NumeroFlutuante chave={`j-${indice}`} valor={numeros.jogador} x={g.jogador.x} y={g.jogador.pes - alturaJogador} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 45% 45%, transparent 35%, rgba(0,0,0,.65) 100%)', opacity: cameraLenta ? 1 : 0, transition: 'opacity 700ms ease-in-out' }} />
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
        <BarraDoInimigo painel={q.monstro} />
      </div>

      {/* embaixo à esquerda: o retrato, a vida e o sobreescudo */}
      <div className="absolute left-2 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 w-[58%] max-w-[290px]">
        <PainelDoJogador painel={q.jogador} retrato={retrato} />
      </div>

      {/* embaixo à direita: as habilidades e quantos ataques (ticks) faltam */}
      <div className="absolute right-2 bottom-[max(10px,env(safe-area-inset-bottom))] z-20 flex items-end gap-1.5">
        {comContagem.map((h) => (
          <div key={h.espaco} className="relative w-12 h-12 border-2 overflow-hidden" title={textoDaFicha(T.habilidade, { nome: h.nome, texto: h.texto })}
            style={{ ...MOLDURA, borderColor: h.ativandoAgora ? '#F3C769' : MOLDURA.borderColor, boxShadow: h.ativandoAgora ? '0 0 12px #F3C769' : 'none' }}>
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

/** A moldura escura dos botões e caixas da HUD (vermelho-sangue, como na referência). */
const MOLDURA: React.CSSProperties = { backgroundColor: 'rgba(20, 8, 10, 0.86)', borderColor: '#6B1F1F', boxShadow: 'inset 0 0 0 1px #2A0A0C, 0 2px 6px rgba(0,0,0,.6)' };

/** Quanto a vida + escudo mudou de um quadro para o outro (negativo = dano, positivo = cura). */
function variacao(antes: PainelLuta, agora: PainelLuta): number {
  return Math.round(agora.hp + agora.escudo - (antes.hp + antes.escudo));
}

/** O número que sobe flutuando: dano em vermelho-amarelado, cura em verde. */
function NumeroFlutuante({ chave, valor, x, y, lento }: { chave: string; valor: number; x: number; y: number; lento?: boolean }) {
  if (!valor) return null;
  const dano = valor < 0;
  return (
    <span key={chave} className={`${lento ? 'cacada-numero-lento' : 'cacada-numero'} absolute z-10 pointer-events-none font-cinzel font-black text-[22px] leading-none`}
      aria-label={textoDaFicha(dano ? T.dano : T.cura, { n: Math.abs(valor) })}
      style={{ left: x, top: y - 6, color: dano ? '#FFD45C' : '#7CF07C', textShadow: '2px 2px 0 #3A0606, -1px -1px 0 #3A0606, 1px -1px 0 #3A0606, -1px 1px 0 #3A0606' }}>
      {dano ? `-${Math.abs(valor)}` : `+${valor}`}
    </span>
  );
}

/** A vida do inimigo: o crânio num losango, a barra (vida e escudo) e os números por cima; os efeitos ficam embaixo. */
function BarraDoInimigo({ painel }: { painel: PainelLuta }) {
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
          <BarraVidaEscudo painel={painel} semTexto />
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
        <div className="h-3 border-2 overflow-hidden" style={{ ...MOLDURA, backgroundColor: '#2a1214' }} role="meter" aria-valuemin={0} aria-valuemax={painel.hpMax} aria-valuenow={Math.round(painel.hp)} aria-label={textoDaFicha(T.vida, { hp: Math.round(painel.hp), max: painel.hpMax })}>
          <div className="h-full transition-all duration-200" style={{ width: `${vida}%`, background: 'linear-gradient(180deg,#E5484D,#9B1B22)' }} />
        </div>
        <div className="flex items-center">
          <span className="relative z-10 -mr-1.5 w-6 h-6 shrink-0 rotate-45 border-2 flex items-center justify-center" style={{ ...MOLDURA, backgroundColor: '#1F4F8F', borderColor: '#BFE0FF' }} aria-label={textoDaFicha(T.nivel, { n: painel.nivel })}>
            <span className="-rotate-45 font-cinzel font-black text-[10px] text-white">{painel.nivel}</span>
          </span>
          <div className="flex-1 h-2.5 border-2 overflow-hidden" style={{ ...MOLDURA, backgroundColor: '#101a2a' }} role="meter" aria-valuemin={0} aria-valuemax={painel.escudoMax} aria-valuenow={Math.round(painel.escudo)} aria-label={textoDaFicha(T.escudo, { n: Math.round(painel.escudo), max: painel.escudoMax })}>
            <div className="h-full transition-all duration-200" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)' }} />
          </div>
        </div>
        {(painel.enfurecido || painel.status.length > 0) && <Status status={painel.status} enfurecido={painel.enfurecido} />}
      </div>
    </div>
  );
}
