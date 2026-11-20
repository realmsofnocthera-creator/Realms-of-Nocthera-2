'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TIPO_AV1, TIPO_H264 } from '@/assets/mapasDaCacada';
import { ESTADOS_DO_CHEFE_MUNDIAL, type ArteDoChefeMundial, type EstadoDoChefeMundial } from '@/assets/chefesMundiaisArte';

/** Um acontecimento da luta que o chefe mostra uma vez: ele ataca ou leva um golpe. O `id` muda a cada vez. */
export interface EventoDoChefe {
  tipo: 'ataque' | 'golpe';
  id: string;
}

/** Quais clipes tocam em laço e quais uma vez só. */
const EM_LACO: Readonly<Record<EstadoDoChefeMundial, boolean>> = { idle: true, furia: true, ataque: false, golpe: false };

/** Qual clipe aparece agora: o evento que está tocando ou, sem evento, a fúria ou o idle. */
export function clipeAtivo(evento: EventoDoChefe | null, furia: boolean): EstadoDoChefeMundial {
  return evento ? evento.tipo : furia ? 'furia' : 'idle';
}

/**
 * A cena do chefe mundial (a arena com o chefe desenhado): quatro vídeos empilhados, só um visível. Fica no idle (ou na fúria,
 * quando o chefe está enfurecido) e, a cada evento, toca o ataque ou o golpe uma vez e volta. `taxaDoAtaque` e `taxaDoGolpe`
 * aceleram os clipes (para acertar o impacto da luta e para o ×2). Com "reduzir movimento" fica só a cena parada.
 */
export function CenaDoChefe({ arte, evento, furia, taxaDoAtaque, taxaDoGolpe, nome, style }: {
  arte: ArteDoChefeMundial;
  evento: EventoDoChefe | null;
  furia: boolean;
  taxaDoAtaque: number;
  taxaDoGolpe: number;
  nome: string;
  style?: React.CSSProperties;
}) {
  const videos = useRef<Partial<Record<EstadoDoChefeMundial, HTMLVideoElement | null>>>({});
  const [reduzir, setReduzir] = useState(false);
  const [terminados, setTerminados] = useState<string[]>([]);
  const eventoAtivo = evento && !terminados.includes(evento.id) ? evento : null;
  const ativo = clipeAtivo(eventoAtivo, furia);

  useEffect(() => {
    setReduzir(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // um evento novo: o clipe volta ao começo e toca na velocidade pedida
  useEffect(() => {
    if (!evento || reduzir) return;
    const v = videos.current[evento.tipo];
    if (!v) return;
    v.currentTime = 0;
    v.playbackRate = Math.min(16, Math.max(0.25, evento.tipo === 'ataque' ? taxaDoAtaque : taxaDoGolpe));
    void v.play().catch(() => undefined);
    // se o vídeo não avisar que acabou, a cena não fica presa nele
    const duracao = evento.tipo === 'ataque' ? 1667 / taxaDoAtaque : 583 / taxaDoGolpe;
    const t = window.setTimeout(() => setTerminados((l) => (l.includes(evento.id) ? l : [...l, evento.id])), duracao + 400);
    return () => window.clearTimeout(t);
  }, [evento, reduzir, taxaDoAtaque, taxaDoGolpe]);

  // só o clipe de laço visível toca (os outros esperam, sem gastar o aparelho)
  useEffect(() => {
    if (reduzir) return;
    for (const e of ESTADOS_DO_CHEFE_MUNDIAL) {
      const v = videos.current[e];
      if (!v) continue;
      if (e === ativo) {
        if (v.paused) void v.play().catch(() => undefined);
      } else if (EM_LACO[e]) {
        v.pause();
      }
    }
  }, [ativo, reduzir]);

  return (
    <div role="img" aria-label={nome} className="absolute max-w-none pointer-events-none overflow-hidden" style={style}>
      {/* a cena parada: a capa enquanto os vídeos carregam e o fundo de quem reduz o movimento */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={arte.arena} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover', imageRendering: 'pixelated' }} />
      {!reduzir && ESTADOS_DO_CHEFE_MUNDIAL.map((e) => (
        <video
          key={e}
          ref={(el) => {
            videos.current[e] = el;
          }}
          data-estado={e}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', imageRendering: 'pixelated', opacity: e === ativo ? 1 : 0 }}
          autoPlay={e === 'idle'}
          loop={EM_LACO[e]}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={() => {
            if (evento && evento.tipo === e) setTerminados((l) => (l.includes(evento.id) ? l : [...l, evento.id]));
          }}
        >
          <source src={arte.clipes[e].av1} type={TIPO_AV1} />
          <source src={arte.clipes[e].h264} type={TIPO_H264} />
        </video>
      ))}
    </div>
  );
}
