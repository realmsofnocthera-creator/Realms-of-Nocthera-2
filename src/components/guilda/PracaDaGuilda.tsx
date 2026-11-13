'use client';

import React, { useEffect, useRef } from 'react';
import { MOLDURAS_DA_PRACA, PRACA_DA_GUILDA, type MolduraDaPraca } from '@/assets/guildaUi';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';

/** O que a placa mostra (o rótulo, um aviso numérico opcional e se está apagada). */
export interface PlacaDaPraca {
  rotulo: string;
  /** Um número no canto da placa (contratos prontos, pedidos esperando...). */
  aviso?: number;
  /** Placa sem função agora: fica no lugar mas não responde ao toque. */
  desligada?: boolean;
  /** Uma segunda linha pequena, abaixo do rótulo. */
  subrotulo?: string;
}

export type MolduraComPlaca = Exclude<MolduraDaPraca, 'quadro'>;

interface PracaDaGuildaProps {
  /** O texto de cada placa; `null` ou ausente deixa a moldura vazia, como na arte. */
  placas: Partial<Record<MolduraComPlaca, PlacaDaPraca | null>>;
  aoAbrir: (moldura: MolduraDaPraca) => void;
  /** O conteúdo do quadro grande do centro. */
  quadro: React.ReactNode;
  quadroAria: string;
  quadroAtivo: boolean;
  /** O que fica por cima do céu da praça (o voltar e o título). */
  topo?: React.ReactNode;
  /** O aviso de resultado, em cima das pedras da praça. */
  rodape?: React.ReactNode;
}

const { largura: L, altura: A } = PRACA_DA_GUILDA;

/** Onde fica a moldura, em % do quadro (a cena escala inteira, então os botões acompanham a arte). */
function posicao(m: MolduraDaPraca): React.CSSProperties {
  const [x0, y0, x1, y1] = MOLDURAS_DA_PRACA[m];
  return { left: `${(x0 / L) * 100}%`, top: `${(y0 / A) * 100}%`, width: `${((x1 - x0) / L) * 100}%`, height: `${((y1 - y0) / A) * 100}%` };
}

const FORMA: Partial<Record<MolduraDaPraca, React.CSSProperties>> = {
  losango: { clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  redonda: { borderRadius: '50%' },
};

function Placa({ moldura, placa, aoAbrir }: { moldura: MolduraComPlaca; placa: PlacaDaPraca; aoAbrir: (m: MolduraDaPraca) => void }) {
  const pequena = moldura === 'losango' || moldura === 'redonda';
  return (
    <button
      type="button"
      onClick={() => aoAbrir(moldura)}
      disabled={placa.desligada}
      aria-label={placa.aviso ? `${placa.rotulo} (${placa.aviso})` : placa.rotulo}
      className="absolute flex flex-col items-center justify-center text-center cursor-pointer enabled:active:bg-[#FFB347]/20 enabled:hover:bg-[#FFB347]/10 disabled:cursor-default disabled:opacity-60 focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
      style={{ ...posicao(moldura), ...FORMA[moldura] }}
    >
      <span className={`font-cinzel font-extrabold uppercase leading-[1.25] text-[#FFE9B0] ${pequena ? 'text-[2.3cqw] px-[3cqw]' : 'text-[2.8cqw] tracking-wide'}`} style={{ textShadow: CONTORNO_PIXEL }}>{placa.rotulo}</span>
      {placa.subrotulo && <span className="font-cinzel font-bold text-[1.8cqw] leading-[1.3] text-[#F3C98B]" style={{ textShadow: CONTORNO_PIXEL }}>{placa.subrotulo}</span>}
      {!!placa.aviso && (
        <span aria-hidden="true" className="absolute top-[0.4cqw] right-[0.8cqw] min-w-[4.4cqw] h-[4.4cqw] px-[0.8cqw] flex items-center justify-center rounded-full border border-[#05070D] bg-[#E5484D] font-cinzel font-black text-[2.3cqw] leading-none text-white">{placa.aviso}</span>
      )}
    </button>
  );
}

/**
 * A praça da guilda (arte do Yuri): o vídeo em repetição, de 1024 x 1536, e por cima as molduras de madeira viram botões:
 * as 4 placas da esquerda, o losango e a placa redonda da direita, e o quadro de avisos do centro. A cena mantém a proporção
 * da arte, então os botões ficam sempre sobre as molduras. Com "reduzir movimento" ligado, o vídeo fica parado na imagem.
 */
export function PracaDaGuilda({ placas, aoAbrir, quadro, quadroAria, quadroAtivo, topo, rodape }: PracaDaGuildaProps) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true; // o navegador só deixa tocar sozinho se estiver mudo
    const reduzir = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const ajustar = () => {
      if (reduzir?.matches) v.pause();
      else void v.play().catch(() => undefined);
    };
    ajustar();
    reduzir?.addEventListener?.('change', ajustar);
    return () => reduzir?.removeEventListener?.('change', ajustar);
  }, []);

  const molduras = ['placa1', 'placa2', 'placa3', 'placa4', 'losango', 'redonda'] as const;

  return (
    <section aria-label={quadroAria} className="relative w-full overflow-hidden bg-[#0B0710]" style={{ aspectRatio: `${L} / ${A}` }}>
      <video
        ref={video}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        poster={PRACA_DA_GUILDA.imagem}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        disablePictureInPicture
      >
        <source src={PRACA_DA_GUILDA.videoAv1} type={PRACA_DA_GUILDA.tipoAv1} />
        <source src={PRACA_DA_GUILDA.videoH264} type={PRACA_DA_GUILDA.tipoH264} />
      </video>

      {topo}

      {molduras.map((m) => {
        const placa = placas[m];
        return placa ? <Placa key={m} moldura={m} placa={placa} aoAbrir={aoAbrir} /> : null;
      })}

      <button
        type="button"
        onClick={() => aoAbrir('quadro')}
        disabled={!quadroAtivo}
        aria-label={quadroAria}
        className="absolute flex flex-col items-center justify-center gap-[0.8cqw] text-center px-[2cqw] cursor-pointer enabled:active:bg-[#FFB347]/15 enabled:hover:bg-[#FFB347]/8 disabled:cursor-default focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE]"
        style={posicao('quadro')}
      >
        {quadro}
      </button>

      {rodape && <div className="absolute inset-x-[4cqw] bottom-[3cqw] flex justify-center">{rodape}</div>}
    </section>
  );
}
