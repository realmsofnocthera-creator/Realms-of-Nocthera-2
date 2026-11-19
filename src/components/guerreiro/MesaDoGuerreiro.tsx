'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cartaDoGuerreiro, GUERREIRO_UI, INTRO_DO_GUERREIRO, MOLDURAS_DO_PAINEL, POSICAO_DAS_CARTAS } from '@/assets/guerreiroUi';
import { TIPO_AV1, TIPO_H264 } from '@/assets/mapasDaCacada';
import type { DificuldadeGuerreiroTela } from '@/lib/guerreiroTela';
import { TEXTOS_DO_GUERREIRO as T } from '@/rules/textosDoGuerreiro';

const ROMANO = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const OURO = '#E6C775';
const pixel = { imageRendering: 'pixelated' } as const;
/** Um tamanho da arte (grade 360 x 540) em pixels da tela: a mesa escala com a largura. */
const u = (n: number) => `calc(var(--u) * ${n})`;
const CHAVE_DA_INTRO = 'guerreiroIntroVista';

/** O texto de um botão da mesa: os botões do Yuri têm uma gema no meio, então o texto vai numa plaquinha escura por cima dela. */
function Rotulo({ tamanho, children }: { tamanho: number; children: React.ReactNode }) {
  return (
    <span className="font-cinzel font-black uppercase leading-none whitespace-nowrap" style={{ fontSize: u(tamanho), color: '#F5E3B3', textShadow: '0 1px 0 #000', backgroundColor: 'rgba(22,8,32,.92)', border: `${u(0.7)} solid #8a6d2a`, padding: `${u(2.5)} ${u(7)}`, borderRadius: u(2) }}>
      {children}
    </span>
  );
}

/**
 * A mesa de tarô da Provação do Guerreiro (arte do Yuri): as 10 dificuldades são as cartas I a X. Ao escolher uma, a mesa
 * se fecha (as cartas sobem e encolhem) e o painel de baixo mostra a carta, o chefe, as chances de emblema e o botão de
 * enfrentar. A abertura (as cartas sendo distribuídas) toca uma vez por visita; com "reduzir movimento" ela é pulada.
 */
export function MesaDoGuerreiro({ dificuldades, selecionada, onSelecionar, onEnfrentar, ocupado }: {
  dificuldades: readonly DificuldadeGuerreiroTela[];
  selecionada: number | null;
  onSelecionar: (dificuldade: number | null) => void;
  onEnfrentar: (dificuldade: number) => void;
  ocupado: boolean;
}) {
  const [intro, setIntro] = useState<'verificando' | 'tocando' | 'fim'>('verificando');
  useEffect(() => {
    let vista = false;
    try {
      vista = window.sessionStorage.getItem(CHAVE_DA_INTRO) === '1';
    } catch {
      vista = false;
    }
    const reduzir = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIntro(vista || reduzir ? 'fim' : 'tocando');
  }, []);
  const terminarIntro = () => {
    try {
      window.sessionStorage.setItem(CHAVE_DA_INTRO, '1');
    } catch {
      /* sem armazenamento: a abertura toca de novo na próxima visita */
    }
    setIntro('fim');
  };

  const compacta = selecionada !== null;
  const pos = compacta ? POSICAO_DAS_CARTAS.compacta : POSICAO_DAS_CARTAS.aberta;
  const escolhida = dificuldades.find((d) => d.dificuldade === selecionada) ?? null;
  const trancada = (d: DificuldadeGuerreiroTela) => d.estado === 'bloqueado';

  return (
    <div style={{ containerType: 'inline-size' }} className="w-full">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '360 / 540', ['--u' as string]: 'calc(100cqw / 360)', backgroundColor: '#120a1c' }}>
        {/* o fundo: a mesa aberta, e por cima a mesa compacta com o painel de detalhe */}
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: `url(${GUERREIRO_UI.fundoMesa})`, backgroundSize: '100% 100%', ...pixel }} />
        <div aria-hidden className="absolute inset-0" style={{ opacity: compacta ? 1 : 0, transition: 'opacity 500ms ease' }}>
          <div className="absolute left-0 top-0 w-full" style={{ height: '66.667%', backgroundImage: `url(${GUERREIRO_UI.fundoCompacto})`, backgroundSize: '100% 100%', ...pixel }} />
          <div className="absolute left-0 bottom-0 w-full" style={{ height: '33.333%', backgroundImage: `url(${GUERREIRO_UI.fundoPainel})`, backgroundSize: '100% 100%', ...pixel }} />
        </div>

        {/* título e volta */}
        <div className="absolute flex items-center justify-center text-center" style={{ left: u(4), top: u(4), width: u(190), height: u(63), backgroundImage: `url(${GUERREIRO_UI.banner})`, backgroundSize: '100% 100%', ...pixel }}>
          <h1 className="font-cinzel font-black uppercase" style={{ fontSize: u(11), color: '#F5E3B3', letterSpacing: '0.08em', padding: `0 ${u(26)}`, lineHeight: 1.15 }}>{T.titulo}</h1>
        </div>
        <Link href="/provacoes" className="absolute flex items-center justify-center active:scale-95" style={{ left: u(260), top: u(6), width: u(96), height: u(32), backgroundImage: `url(${GUERREIRO_UI.botao})`, backgroundSize: '100% 100%', ...pixel }}>
          <Rotulo tamanho={8}>{T.voltar}</Rotulo>
        </Link>

        {/* as cartas I a X */}
        <ul aria-label={T.escolha} className="absolute inset-0" style={{ opacity: intro === 'fim' ? 1 : 0, transition: 'opacity 400ms ease' }}>
          {dificuldades.map((d, i) => {
            const eu = d.dificuldade === selecionada;
            const fechada = trancada(d);
            return (
              <li key={d.dificuldade} className="absolute" style={{ left: u(pos.x[i] - pos.largura / 2), top: u(pos.y[i]), width: u(pos.largura), height: u(pos.altura), transition: 'left 600ms cubic-bezier(.4,0,.2,1), top 600ms cubic-bezier(.4,0,.2,1), width 600ms cubic-bezier(.4,0,.2,1), height 600ms cubic-bezier(.4,0,.2,1)', zIndex: eu ? 5 : 1 }}>
                <span aria-hidden className="absolute left-1/2 -translate-x-1/2 font-cinzel font-black leading-none" style={{ bottom: '100%', marginBottom: u(2), fontSize: u(compacta ? 8 : 10), color: OURO, textShadow: '0 1px 0 #000, 0 0 4px #000' }}>{ROMANO[i]}</span>
                <button type="button" onClick={() => onSelecionar(eu ? null : d.dificuldade)} aria-pressed={eu} aria-label={`${T.dificuldade(ROMANO[i])}: ${d.nome}${fechada ? ` (${T.trancada})` : ''}`}
                  className="block w-full h-full cursor-pointer active:scale-95 focus-visible:outline-none"
                  style={{ transform: eu ? `translateY(${u(-3)})` : undefined, transition: 'transform 250ms ease, filter 250ms ease', filter: eu ? 'drop-shadow(0 0 6px #F3C769)' : d.estado === 'tentativaUsada' ? 'grayscale(.7) brightness(.8)' : compacta ? 'brightness(.8)' : undefined, outline: eu ? `${u(1)} solid #F3C769` : undefined }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cartaDoGuerreiro(d.dificuldade, compacta ? 34 : 50, fechada)} alt="" draggable={false} className="block w-full h-full" style={pixel} />
                  {d.vencido && (
                    <span className="absolute flex items-center justify-center rounded-full" style={{ right: u(-3), top: u(-3), width: u(compacta ? 11 : 14), height: u(compacta ? 11 : 14), backgroundColor: '#1f6a29', border: `${u(1)} solid #F3C769` }} role="img" aria-label={T.vencida}>
                      <Check style={{ width: '70%', height: '70%', color: '#F5E3B3' }} strokeWidth={4} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* o painel de detalhe da carta escolhida */}
        <div className="absolute inset-0" style={{ opacity: compacta ? 1 : 0, pointerEvents: compacta ? 'auto' : 'none', transition: 'opacity 450ms ease 150ms' }}>
          {escolhida && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cartaDoGuerreiro(escolhida.dificuldade, 96, trancada(escolhida))} alt="" draggable={false} className="absolute" style={{ left: u(36), top: u(374), width: u(96), height: u(144), ...pixel }} />
              <div className="absolute flex items-center justify-center text-center" style={{ left: u(158), top: u(364), width: u(190), height: u(63), backgroundImage: `url(${GUERREIRO_UI.banner})`, backgroundSize: '100% 100%', ...pixel }}>
                <span className="font-cinzel font-black" style={{ fontSize: u(13), color: '#F5E3B3', textShadow: '0 1px 0 #000' }}>{T.dificuldade(ROMANO[escolhida.dificuldade - 1])}</span>
              </div>
              <div className="absolute text-center" style={{ left: u(160), top: u(430), width: u(186) }}>
                <div className="font-cinzel font-black leading-tight" style={{ fontSize: u(10.5), color: '#F3E6CC', textShadow: '0 1px 0 #000' }}>{escolhida.nome}</div>
                <div className="font-cinzel font-bold leading-tight" style={{ fontSize: u(8.5), color: '#C8A8F0', textShadow: '0 1px 0 #000', marginTop: u(2) }}>{escolhida.carta} · {escolhida.mecanicaNome}</div>
              </div>
              {MOLDURAS_DO_PAINEL.x.map((x, k) => {
                const c = escolhida.chances[k];
                return (
                  <div key={x} className="absolute flex items-center justify-center" title={c ? `${c.nome} ${c.percentual}%` : undefined}
                    style={{ left: u(x), top: u(MOLDURAS_DO_PAINEL.y), width: u(MOLDURAS_DO_PAINEL.lado), height: u(MOLDURAS_DO_PAINEL.lado), backgroundImage: `url(${GUERREIRO_UI.moldura})`, backgroundSize: '100% 100%', ...pixel }}>
                    {c && (
                      <span className="flex flex-col items-center leading-none font-black" style={{ color: c.cor, textShadow: '0 1px 0 #000, 0 0 3px #000' }}>
                        <span aria-hidden className="block rotate-45" style={{ width: u(6), height: u(6), backgroundColor: c.cor, boxShadow: `0 0 ${u(3)} ${c.cor}`, marginBottom: u(3) }} />
                        <span style={{ fontSize: u(7.5) }}>{c.percentual}%</span>
                      </span>
                    )}
                  </div>
                );
              })}
              <button type="button" disabled={ocupado || escolhida.estado !== 'disponivel'} onClick={() => onEnfrentar(escolhida.dificuldade)} aria-label={T.enfrentar}
                className="absolute flex items-center justify-center cursor-pointer disabled:cursor-not-allowed active:scale-95"
                style={{ left: u(216), top: u(506), width: u(96), height: u(32), backgroundImage: `url(${GUERREIRO_UI.botao})`, backgroundSize: '100% 100%', filter: escolhida.estado === 'disponivel' ? undefined : 'grayscale(1) brightness(.7)', ...pixel }}>
                <Rotulo tamanho={9}>{ocupado ? T.enfrentando : T.enfrentar}</Rotulo>
              </button>
            </>
          )}
        </div>

        {/* a abertura: as cartas sendo distribuídas (uma vez por visita) */}
        {intro === 'tocando' && (
          <video className="absolute inset-0 w-full h-full cursor-pointer" style={{ objectFit: 'cover', ...pixel }} autoPlay muted playsInline preload="auto" disablePictureInPicture aria-label={T.pularIntro}
            onEnded={terminarIntro} onClick={terminarIntro} onError={terminarIntro}>
            <source src={INTRO_DO_GUERREIRO.videoAv1} type={TIPO_AV1} />
            <source src={INTRO_DO_GUERREIRO.videoH264} type={TIPO_H264} />
          </video>
        )}
      </div>
    </div>
  );
}
