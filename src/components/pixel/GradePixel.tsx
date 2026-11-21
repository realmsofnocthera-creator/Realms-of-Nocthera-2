import React from 'react';

/**
 * Peças para montar uma tela sobre a grade de pixel do Yuri (360 x 540): `u(n)` é um tamanho da grade em pixels da tela (a tela
 * escala com o menor lado, definido pela variável `--u` no palco), `Peca` põe uma imagem e `Texto` um texto, ambos pelas
 * coordenadas da grade.
 */
export const u = (n: number) => `calc(var(--u) * ${n})`;
export const pixel = { imageRendering: 'pixelated' } as const;
export const SOMBRA_DO_TEXTO = '0 1px 0 #000, 0 0 3px #000';

export interface Retangulo {
  x: number;
  y: number;
  l: number;
  a: number;
}

/** O palco da tela: 2:3, do tamanho que couber, com o mesmo fundo desfocado e escuro no que sobrar em volta. */
export function PalcoPixel({ fundo, children }: { fundo: string; children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 select-none overflow-hidden" style={{ backgroundColor: '#0d0a12' }}>
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: `url(${fundo})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px) brightness(.45)', transform: 'scale(1.1)', ...pixel }} />
      <div className="absolute left-1/2 top-1/2" style={{ aspectRatio: '360 / 540', height: 'min(100dvh, calc(100vw * 1.5))', transform: 'translate(-50%, -50%)', containerType: 'size', ['--u' as string]: 'calc(100cqh / 540)' }}>
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundImage: `url(${fundo})`, backgroundSize: '100% 100%', ...pixel }}>
          {children}
        </div>
      </div>
    </main>
  );
}

/** Uma peça da arte posicionada na grade (as peças filhas usam coordenadas da própria peça se `children` vier num contêiner). */
export function Peca({ src, p, className = '', style, children }: { src: string; p: Retangulo; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div className={`absolute ${className}`} style={{ left: u(p.x), top: u(p.y), width: u(p.l), height: u(p.a), backgroundImage: `url(${src})`, backgroundSize: '100% 100%', ...pixel, ...style }}>
      {children}
    </div>
  );
}

/** Um texto numa linha da grade (x e y do centro, ou do começo/fim conforme `alinhar`), com contorno para ler sobre a arte. */
export function Texto({ x, y, tamanho, children, cor = '#F5E3B3', alinhar = 'center', largura = 200, negrito = true, caixaAlta = false }: {
  x: number; y: number; tamanho: number; children: React.ReactNode; cor?: string; alinhar?: 'center' | 'left' | 'right'; largura?: number; negrito?: boolean; caixaAlta?: boolean;
}) {
  const esquerda = alinhar === 'center' ? x - largura / 2 : alinhar === 'left' ? x : x - largura;
  return (
    <span className="absolute font-cinzel leading-none whitespace-nowrap overflow-hidden text-ellipsis flex items-center" style={{ left: u(esquerda), top: u(y), width: u(largura), height: u(tamanho * 1.3), marginTop: u(-tamanho * 0.65), fontSize: u(tamanho), color: cor, textShadow: SOMBRA_DO_TEXTO, fontWeight: negrito ? 800 : 500, textTransform: caixaAlta ? 'uppercase' : undefined, justifyContent: alinhar === 'center' ? 'center' : alinhar === 'left' ? 'flex-start' : 'flex-end' }}>
      {children}
    </span>
  );
}
