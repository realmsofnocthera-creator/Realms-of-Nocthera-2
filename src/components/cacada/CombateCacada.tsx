'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bug, Droplet, Flame, Ghost, Moon, Skull, SkipForward, Snowflake, Sparkles, Swords, Zap, Shield, Heart, Info } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import type { ResultadoCombate } from '@/game/combat';
import type { MonsterDefinition } from '@/rules/monsters';
import type { EfeitoStatus } from '@/rules/statusEffects';
import { EFEITOS_STATUS } from '@/rules/statusEffects';
import { resolveAvatarSrc } from '@/assets/avatars';
import { ALTURA_MONSTRO_PADRAO, CENARIO_ESTRELA, SPRITE_CLASSE, SPRITE_MONSTRO } from '@/lib/cacadaArte';
import { larguraDasBarras, montarQuadros, PainelLuta, QuadroLuta, TipoLinha } from '@/lib/cacadaReplay';

interface CombateCacadaProps {
  resultado: ResultadoCombate;
  personagem: CharacterDocument;
  monstro: MonsterDefinition;
  titulo: string;
  /** estrela do monstro, para escolher o cenário */
  estrela?: number;
  /** HP com que o personagem entra na luta (Batalha Sangrenta). */
  hpInicialJogador?: number;
  onFim: () => void;
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

const ICONE_LINHA: Record<TipoLinha, { Icone: typeof Flame; cor: string }> = {
  ataque: { Icone: Swords, cor: '#D9D9D9' },
  habilidade: { Icone: Sparkles, cor: '#F3C769' },
  dano: { Icone: Zap, cor: '#E5484D' },
  status: { Icone: Droplet, cor: '#E5484D' },
  cura: { Icone: Heart, cor: '#5FCB6A' },
  info: { Icone: Info, cor: '#9A9A9A' },
};

/** Barra única: vermelha por baixo (vida) e azul por cima (Sobreescudo); a vida aparece conforme o escudo cai. */
export function BarraVidaEscudo({ painel }: { painel: PainelLuta }) {
  const { vida, escudo } = larguraDasBarras(painel);
  return (
    <div className="relative h-4 rounded-sm overflow-hidden border" style={{ borderColor: '#000', backgroundColor: '#2a1214' }} role="group"
      aria-label={`Vida ${Math.round(painel.hp)} de ${painel.hpMax}${painel.escudo > 0 ? `, escudo ${Math.round(painel.escudo)}` : ''}`}>
      <div className="absolute inset-y-0 left-0 transition-all duration-200" style={{ width: `${vida}%`, background: 'linear-gradient(180deg,#E5484D,#9B1B22)' }} />
      {escudo > 0 && (
        <div className="absolute inset-y-0 left-0 transition-all duration-200" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)', opacity: 0.92 }} />
      )}
      <div className="absolute inset-0 flex items-center justify-end gap-1.5 px-1.5 text-[10px] font-bold font-cinzel text-white" style={{ textShadow: '0 1px 2px #000' }}>
        {painel.escudo > 0 && <span style={{ color: '#BFE0FF' }}>+{Math.round(painel.escudo)}</span>}
        <span>{Math.round(painel.hp)} / {painel.hpMax}</span>
      </div>
    </div>
  );
}

function Status({ status, enfurecido }: { status: EfeitoStatus[]; enfurecido?: boolean }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {enfurecido && (
        <span title="Enfurecido" className="w-[19px] h-[19px] rounded-sm flex items-center justify-center border" style={{ backgroundColor: '#3a0d0d', borderColor: '#E5484D' }}>
          <Flame className="w-3 h-3" style={{ color: '#FF6B4A' }} aria-label="Enfurecido" />
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

function Painel({ painel, retrato }: { painel: PainelLuta; retrato?: string }) {
  const temStatus = painel.enfurecido || painel.status.length > 0;
  return (
    <div className="relative flex items-stretch gap-1">
      {retrato && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={retrato} alt="" aria-hidden="true" className="w-[42px] h-[42px] shrink-0 rounded-sm object-cover border-2" style={{ borderColor: OURO }} />
      )}
      <div className="flex-1 min-w-0 rounded-sm border-2 px-1.5 py-0.5 flex flex-col gap-0.5" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
        <div className="flex items-center justify-between gap-2 font-cinzel text-[12px] leading-tight text-[#F3E6CC]">
          <span className="truncate font-bold min-w-0">{painel.nome}</span>
          <span className="shrink-0 text-[11px]">Nv. {painel.nivel}</span>
        </div>
        <BarraVidaEscudo painel={painel} />
      </div>
      {/* Status logo abaixo da barra, sem aumentar o painel */}
      {temStatus && (
        <div className={`absolute top-full mt-1 ${retrato ? 'left-[46px]' : 'left-0'}`}>
          <Status status={painel.status} enfurecido={painel.enfurecido} />
        </div>
      )}
    </div>
  );
}

/**
 * Cenário de 1024×1536 com a plataforma do monstro em cima (x 65%, y 36%) e a do jogador embaixo (x 50%, y 80%).
 * A imagem cobre toda a área do mapa (sem deformar) e as plataformas viram posições em pixels, então nada sai
 * do lugar em telas de tamanhos diferentes. Para caber do monstro aos pés do jogador, o mapa precisa de ~0,93 da largura em altura.
 */
const CENA = { w: 1024, h: 1536, topo: 0.22, base: 0.84, monstroX: 0.65, monstroPes: 0.385, jogadorX: 0.47, jogadorPes: 0.835, alturaMonstro: 0.13, alturaJogador: 0.33 };

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
 * Tela de combate da Caçada: reprodução automática da luta resolvida no servidor (×1 / ×2), com barras únicas de
 * vida e escudo, status, log e as 5 habilidades com o quanto falta para cada uma ativar.
 */
export function CombateCacada({ resultado, personagem, monstro, titulo, estrela, hpInicialJogador, onFim }: CombateCacadaProps) {
  const quadros: QuadroLuta[] = useMemo(() => montarQuadros(resultado, personagem, monstro, 5, hpInicialJogador), [resultado, personagem, monstro, hpInicialJogador]);
  const [indice, setIndice] = useState(0);
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

  useEffect(() => {
    if (fim) {
      const t = setTimeout(onFim, 1200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndice((i) => Math.min(quadros.length - 1, i + 1)), rapido ? 450 : 900);
    return () => clearTimeout(t);
  }, [indice, fim, rapido, quadros.length, onFim]);

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

  const cenario = estrela ? CENARIO_ESTRELA[estrela] : undefined;
  const spriteJogador = SPRITE_CLASSE[personagem.classeId];
  const spriteMonstro = SPRITE_MONSTRO[monstro.id];
  const retrato = resolveAvatarSrc(personagem.avatarId, personagem.classeId);
  const g = geometriaDaCena(caixa.w, caixa.h);
  const alturaJogador = spriteJogador ? g.jogador.altura : g.jogador.altura * 0.7;
  const alturaMonstro = spriteMonstro ? g.monstro.altura : g.monstro.altura * (ALTURA_MONSTRO_PADRAO / 22);

  return (
    <div className="relative w-full h-dvh flex flex-col select-none overflow-hidden" style={{ backgroundColor: '#07050a' }}>
      <style>{`@media (prefers-reduced-motion: no-preference){@keyframes cacadaGolpe{0%{transform:translateX(0);filter:brightness(1)}20%{transform:translateX(-5px);filter:brightness(2.2) saturate(.3)}45%{transform:translateX(5px)}70%{transform:translateX(-2px)}100%{transform:translateX(0);filter:brightness(1)}}.cacada-golpe{animation:cacadaGolpe .35s ease-out}}`}</style>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[480px] mx-auto">
        {/* Mapa em tela cheia, com a HUD por cima */}
        <div ref={arenaRef} className="relative flex-1 min-h-[340px] overflow-hidden" style={{ backgroundColor: '#0d1412' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cenario ?? '/images/landing-bg.webp'} alt="" aria-hidden="true" draggable={false}
            className="absolute max-w-none" style={{ width: g.imgW, height: g.imgH, left: -g.esq, top: -g.topo, filter: cenario ? 'none' : 'brightness(0.4)', objectFit: 'cover' }} />
          {/* Monstro */}
          <div className="absolute -translate-x-1/2" style={{ left: g.monstro.x, top: g.monstro.pes - alturaMonstro, height: alturaMonstro,
            aspectRatio: spriteMonstro ? String(spriteMonstro.proporcao) : '1', opacity: q.monstro.hp > 0 ? 1 : 0.2, transition: 'opacity 0.6s' }}>
            <div key={tremor.monstro} className={tremor.monstro > 0 ? 'cacada-golpe w-full h-full' : 'w-full h-full'}>
              {spriteMonstro ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={spriteMonstro.src} alt={monstro.nome} className="w-full h-full object-contain" draggable={false} />
              ) : (
                <div role="img" aria-label={monstro.nome} className="w-full h-full rounded-full flex items-center justify-center"
                  style={{ background: 'radial-gradient(circle at 50% 40%, rgba(25,12,20,0.95), rgba(0,0,0,0.85) 70%)', border: `2px solid ${OURO}55` }}>
                  <span className="font-cinzel font-black text-2xl" style={{ color: `${OURO}99` }}>?</span>
                </div>
              )}
            </div>
          </div>
          {/* Jogador */}
          <div className="absolute -translate-x-1/2" style={{ left: g.jogador.x, top: g.jogador.pes - alturaJogador, height: alturaJogador,
            aspectRatio: spriteJogador ? String(spriteJogador.proporcao) : '1', opacity: q.jogador.hp > 0 ? 1 : 0.3, transition: 'opacity 0.6s' }}>
            <div key={tremor.jogador} className={tremor.jogador > 0 ? 'cacada-golpe w-full h-full' : 'w-full h-full'}>
              {spriteJogador ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={spriteJogador.src} alt={personagem.nome} className="w-full h-full object-contain" draggable={false} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={retrato} alt={personagem.nome} className="w-full h-full object-cover rounded-full border-2" style={{ borderColor: `${OURO}88` }} draggable={false} />
              )}
            </div>
          </div>

          {/* HUD: topo */}
          <div className="absolute inset-x-1.5 top-1.5 flex items-center gap-1.5 z-20">
            <div className="shrink-0 px-2 py-0.5 rounded-sm border-2 text-center font-cinzel text-[#F3E6CC] leading-tight" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
              <div className="text-[9px]">Turno</div>
              <div className="text-[13px] font-bold">{q.turno}</div>
            </div>
            <div className="flex-1 min-w-0 px-2 py-0.5 rounded-sm border-2 text-center font-cinzel text-[#F3E6CC] leading-tight" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
              <div className="text-[12px] font-bold truncate">{titulo}</div>
              <div className="text-[10px]">1 / 1</div>
            </div>
            <button type="button" onClick={() => setRapido((r) => !r)} aria-label={rapido ? 'Velocidade normal' : 'Velocidade dobrada'}
              className="shrink-0 px-2 py-1.5 rounded-sm border-2 font-cinzel font-bold text-[13px] cursor-pointer active:scale-95" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO, color: rapido ? '#F3C769' : '#BFAF8F' }}>
              »» ×2
            </button>
            <button type="button" onClick={() => setIndice(quadros.length - 1)} aria-label="Pular para o fim"
              className="shrink-0 p-1.5 rounded-sm border-2 cursor-pointer active:scale-95" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO, color: '#BFAF8F' }}>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* HUD: monstro, no alto à direita */}
          <div className="absolute right-1.5 top-[54px] w-[56%] z-20"><Painel painel={q.monstro} /></div>

          {/* HUD: jogador, embaixo à esquerda (deixa uma faixa para os status) */}
          <div className="absolute left-1.5 bottom-7 w-[68%] z-20"><Painel painel={q.jogador} retrato={retrato} /></div>
        </div>

        {/* Fora do mapa: só o log e as habilidades */}
        <div className="flex flex-col gap-1.5 px-1.5 pt-1.5 pb-1.5">
          <div className="rounded-sm border-2 px-2 py-1 flex flex-col justify-end gap-0.5 h-[112px] max-[720px]:h-[72px] overflow-hidden" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }} aria-live="polite">
            {q.linhas.map((l, i) => {
              const { Icone, cor } = ICONE_LINHA[l.tipo];
              return (
                <div key={`${indice}-${i}`} className="flex items-center gap-2 text-[12px] leading-tight text-[#EDE3CF]">
                  <Icone className="w-3.5 h-3.5 shrink-0" style={{ color: cor }} aria-hidden="true" />
                  <span className="truncate">{destacarLinha(l.texto)}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-5 gap-1.5 rounded-sm border-2 p-1.5" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
            {q.habilidades.map((h) => (
              <div key={h.espaco} className="flex flex-col items-center gap-1" title={`${h.nome}: ${h.texto}`}>
                <div className="relative w-full aspect-square rounded-sm overflow-hidden border-2"
                  style={{ borderColor: h.ativandoAgora ? '#F3C769' : '#3a3030', boxShadow: h.ativandoAgora ? '0 0 10px #F3C769' : 'none', opacity: h.bloqueada ? 0.4 : 1 }}>
                  {h.icone ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.icone} alt={h.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1a1416]"><Shield className="w-5 h-5 text-[#8a7a5a]" /></div>
                  )}
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#2b2424]" aria-label={`${h.nome}: ${h.texto}`}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.round(h.progresso * 100)}%`, backgroundColor: h.ativandoAgora ? '#F3C769' : '#C08A3E' }} />
                </div>
                <span className="text-[9px] leading-none font-cinzel text-[#BFAF8F] whitespace-nowrap">{h.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
