import React from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { Peca, Texto, pixel, u, SOMBRA_DO_TEXTO } from '@/components/pixel/GradePixel';

export const CREME = '#F5E3B3';
export const DOURADO = '#F3C769';
export const SUB = '#C8A25A';
export const TINTA = '#2A1A0E';

/**
 * Uma peça que estica na horizontal sem deformar as pontas (3 fatias): a ponta esquerda (`esq` px da arte) e a direita (`dir` px) ficam
 * como são e o miolo (a faixa `miolo` da arte) se estica até a largura pedida. É como a arte do Yuri mostra os cartões da lista.
 */
export function Fatiada({ src, x, y, l, a, origemL, esq, dir, miolo, children }: {
  src: string; x: number; y: number; l: number; a: number; origemL: number; esq: number; dir: number; miolo: [number, number]; children?: React.ReactNode;
}) {
  const largMiolo = l - esq - dir;
  const k = largMiolo / (miolo[1] - miolo[0]);
  const base = { backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat', ...pixel } as const;
  return (
    <div className="absolute" style={{ left: u(x), top: u(y), width: u(l), height: u(a) }}>
      <div className="absolute inset-y-0 left-0" style={{ ...base, width: u(esq), backgroundSize: `${u(origemL)} ${u(a)}`, backgroundPosition: '0 0' }} />
      <div className="absolute inset-y-0" style={{ ...base, left: u(esq), width: u(largMiolo), backgroundSize: `calc(var(--u) * ${origemL * k}) ${u(a)}`, backgroundPosition: `calc(var(--u) * ${-miolo[0] * k}) 0` }} />
      <div className="absolute inset-y-0 right-0" style={{ ...base, width: u(dir), backgroundSize: `${u(origemL)} ${u(a)}`, backgroundPosition: '100% 0' }} />
      {children}
    </div>
  );
}

/** Uma imagem num buraco redondo (o retrato dentro do anel do cartão): centro e diâmetro na grade. */
export function Medalhao({ src, cx, cy, d, alt = '' }: { src: string; cx: number; cy: number; d: number; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} className="absolute rounded-full object-cover" style={{ left: u(cx - d / 2), top: u(cy - d / 2), width: u(d), height: u(d), ...pixel }} />
  );
}

/** Um botão com a arte (3 estados) e o texto por cima. */
export function BotaoDeArte({ x, y, l, a, src, apertado, desligado, onClick, rotulo, children, tamanho = 9 }: {
  x: number; y: number; l: number; a: number; src: { normal: string; off: string; press: string }; apertado?: boolean; desligado?: boolean; onClick: () => void; rotulo?: string; children: React.ReactNode; tamanho?: number;
}) {
  const [pressionado, setPressionado] = React.useState(false);
  const arte = desligado ? src.off : pressionado || apertado ? src.press : src.normal;
  return (
    <button type="button" onClick={onClick} disabled={desligado} aria-label={rotulo}
      onPointerDown={() => setPressionado(true)} onPointerUp={() => setPressionado(false)} onPointerLeave={() => setPressionado(false)} onPointerCancel={() => setPressionado(false)}
      className="absolute cursor-pointer disabled:cursor-not-allowed" style={{ left: u(x), top: u(y), width: u(l), height: u(a), backgroundImage: `url(${arte})`, backgroundSize: '100% 100%', ...pixel }}>
      <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(tamanho), color: desligado ? '#A99C80' : TINTA, paddingTop: u(pressionado ? 1.5 : 0) }}>{children}</span>
    </button>
  );
}

/** Uma janela escura sobre a tela (regras, lutas, pódio, baú) com o botão de arte do Yuri para fechar. */
export function Janela({ titulo, aoFechar, fechar, children }: { titulo: string; aoFechar: () => void; fechar: string; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-label={titulo} className="absolute inset-0 z-30" style={{ backgroundColor: 'rgba(5,4,10,.78)' }}>
      <div className="absolute" style={{ left: u(18), top: u(44), width: u(324), height: u(452), backgroundColor: 'rgba(16,13,22,.96)', border: `${u(1.4)} solid #8a6d2a`, boxShadow: `inset 0 0 0 ${u(0.8)} #2a1f0c` }}>
        <h2 className="absolute font-cinzel font-black uppercase text-center" style={{ left: 0, right: 0, top: u(8), fontSize: u(10), color: DOURADO, textShadow: SOMBRA_DO_TEXTO }}>{titulo}</h2>
        <div className="absolute overflow-y-auto" style={{ left: u(10), right: u(10), top: u(28), bottom: u(46), fontSize: u(6.4), color: CREME, lineHeight: 1.45 }}>{children}</div>
        <BotaoDeArte x={77} y={414} l={170} a={31} src={{ normal: ARENA_UI.botao, off: ARENA_UI.botaoOff, press: ARENA_UI.botaoPress }} onClick={aoFechar}>{fechar}</BotaoDeArte>
      </div>
    </div>
  );
}

export { Peca, Texto, pixel, u, SOMBRA_DO_TEXTO };
