'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { arteDaCarta, personagemDaCarta } from '@/assets/cartasDaAlma';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOME_DA_CATEGORIA, TIPO_DE_CARTA_MAP, textoDoEfeito, valorFixoDaCarta, valorFixoDaRaridade, type CartaItem } from '@/rules/almas';

/** A cor do brilho de cada carta mítica (combina com o personagem e o fundo). */
const COR_DA_MITICA: Readonly<Record<string, string>> = {
  'alma-mitico-1': '#F2C94C', // Origem da Magia
  'corpo-mitico-1': '#4CE6A0', // Fonte da Vida
  'mente-mitico-1': '#E8B84A', // Domínio do Instante
  'alma-mitico-2': '#E5484D', // Domínio do Caos
  'corpo-mitico-2': '#5AA9FF', // Muralha Inquebrável
  'mente-mitico-2': '#D8453F', // Perfeição Fatal
  'alma-mitico-3': '#9B7BFF', // Destino Inevitável
  'corpo-mitico-3': '#FFE9A0', // Força Primordial
  'mente-mitico-3': '#B06BFF', // Consciência Absoluta
};

/** As faíscas que sobem na carta animada: posição, atraso e duração fixos (sem sorteio, para a tela não mudar a cada desenho). */
const FAISCAS = [
  { left: '12%', atraso: '0s', dur: '3.4s' },
  { left: '24%', atraso: '1.1s', dur: '3.9s' },
  { left: '36%', atraso: '0.5s', dur: '3.2s' },
  { left: '47%', atraso: '1.8s', dur: '4.1s' },
  { left: '58%', atraso: '0.2s', dur: '3.6s' },
  { left: '69%', atraso: '1.4s', dur: '3.3s' },
  { left: '80%', atraso: '0.8s', dur: '4s' },
  { left: '88%', atraso: '2.1s', dur: '3.5s' },
];

/**
 * A arte de uma carta da Alma. As míticas têm duas camadas (o fundo e, na frente, o personagem) e, com `animada`,
 * ganham vida: o personagem flutua e brilha, o fundo respira, uma luz varre a carta e sobem faíscas. `explosao`
 * (um número que sobe a cada toque) dispara uma onda de luz. Quem não tem arte fica de fora (devolve nada).
 */
export function ArteDaCarta({
  tipoId,
  className = '',
  style,
  animada = false,
  explosao = 0,
}: {
  tipoId: string;
  className?: string;
  style?: React.CSSProperties;
  animada?: boolean;
  explosao?: number;
}) {
  const fundo = arteDaCarta(tipoId);
  if (!fundo) return null;
  const personagem = personagemDaCarta(tipoId);
  if (!personagem) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fundo} alt="" aria-hidden="true" className={className} style={{ imageRendering: 'pixelated', ...style }} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`carta-mitica relative block ${animada ? 'carta-mitica--animada' : ''} ${className}`}
      style={{ ['--cor' as string]: COR_DA_MITICA[tipoId] ?? '#F2C94C', ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fundo} alt="" className="carta-mitica__fundo" />
      <span className="carta-mitica__caixa">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={personagem} alt="" className="carta-mitica__personagem" />
      </span>
      <span className="carta-mitica__brilho" />
      {animada && FAISCAS.map((f, i) => <span key={i} className="carta-mitica__particula" style={{ left: f.left, ['--atraso' as string]: f.atraso, ['--dur' as string]: f.dur }} />)}
      {animada && explosao > 0 && (
        <span key={explosao} className="contents">
          <span className="carta-mitica__flash" />
          <span className="carta-mitica__onda" />
        </span>
      )}
    </span>
  );
}

/** A miniatura da carta que abre o visualizador ao tocar. */
export function MiniaturaDaCarta({
  tipoId,
  nome,
  className,
  style,
  aoAbrir,
}: {
  tipoId: string;
  nome: string;
  className: string;
  style?: React.CSSProperties;
  aoAbrir?: () => void;
}) {
  if (!arteDaCarta(tipoId)) return null;
  if (!aoAbrir) return <ArteDaCarta tipoId={tipoId} className={className} style={style} />;
  return (
    <button type="button" onClick={aoAbrir} aria-label={`Ver a carta ${nome}`} className="shrink-0 cursor-pointer p-0 border-0 bg-transparent self-start">
      <ArteDaCarta tipoId={tipoId} className={className} style={style} />
    </button>
  );
}

/**
 * A carta em tamanho grande, por cima da tela. A carta mítica abre animada; tocar nela dispara uma onda de luz e
 * mexer o dedo (ou o mouse) sobre ela inclina a carta, como um holograma.
 */
export function VisualizadorDaCarta({ tipoId, carta, aoFechar }: { tipoId: string; carta?: CartaItem; aoFechar: () => void }) {
  const tipo = TIPO_DE_CARTA_MAP[tipoId];
  const [explosao, setExplosao] = useState(0);
  const [inclinacao, setInclinacao] = useState({ x: 0, y: 0 });
  if (!tipo) return null;
  const raridade = EMBLEMA_RARIDADE_MAP[tipo.raridade];
  const mitica = tipo.raridade === 'mitico';
  const fixo = carta ? valorFixoDaCarta(carta) : valorFixoDaRaridade(tipo.fixo, tipo.raridade);

  function mover(e: React.PointerEvent<HTMLButtonElement>) {
    if (!mitica || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setInclinacao({ x: -py * 14, y: px * 14 });
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Carta ${tipo.nome}`} onClick={aoFechar} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div onClick={(e) => e.stopPropagation()} className="caixa-pixel relative flex flex-col items-center gap-3 max-w-[340px] w-full p-4">
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="pilula-pixel absolute top-2.5 right-2.5 z-10 w-8 h-8 flex items-center justify-center cursor-pointer">
          <X className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => mitica && setExplosao((n) => n + 1)}
          onPointerMove={mover}
          onPointerLeave={() => setInclinacao({ x: 0, y: 0 })}
          aria-label={mitica ? `Tocar na carta ${tipo.nome}` : `Carta ${tipo.nome}`}
          className="block p-0 border-0 bg-transparent cursor-pointer"
          style={{ width: 'min(68vw, 270px)', aspectRatio: '216 / 300', perspective: '700px' }}
        >
          <span className="block w-full h-full transition-transform duration-150 ease-out" style={{ transform: `rotateX(${inclinacao.x}deg) rotateY(${inclinacao.y}deg)`, transformStyle: 'preserve-3d' }}>
            <ArteDaCarta tipoId={tipoId} className="w-full h-full" animada={mitica} explosao={explosao} />
          </span>
        </button>
        <div className="text-center flex flex-col gap-0.5">
          <span className="font-cinzel font-bold text-lg leading-tight" style={{ color: raridade.cor }}>{tipo.nome}</span>
          <span className="text-[11px] uppercase tracking-wide" style={{ color: '#D5C7A4' }}>{raridade.nome} · {NOME_DA_CATEGORIA[tipo.categoria]}</span>
          <span className="text-xs" style={{ color: '#F5E3B3' }}>{textoDoEfeito(tipo.fixo, fixo)} <span style={{ color: '#8d8574' }}>(fixo)</span></span>
          {carta?.efeitos.map((e, i) => <span key={i} className="text-xs" style={{ color: '#D5C7A4' }}>{textoDoEfeito(e.efeito, e.valor)}</span>)}
          {mitica && <span className="text-[10px] mt-1" style={{ color: '#8d8574' }}>Toque na carta para soltar uma onda de luz.</span>}
        </div>
      </div>
    </div>
  );
}
