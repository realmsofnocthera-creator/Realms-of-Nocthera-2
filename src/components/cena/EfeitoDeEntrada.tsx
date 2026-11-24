'use client';

import React, { useEffect, useState } from 'react';
import { ALTURA_DE_REFERENCIA, arteDaAura, arteDaMoldura, arteDoEfeito, type ArteEmCamadas, type FolhaDeCosmetico } from '@/assets/cosmeticosArte';
import { efeitoDeEntrada } from '@/rules/efeitosDeEntrada';

const ESTILOS = `
@keyframes cos-folha { from { background-position-x: 0%; } to { background-position-x: 100%; } }
`;

function usaMenosMovimento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Uma tira de quadros tocando por CSS (`steps`). Parada no primeiro quadro com "reduzir movimento". */
function Tira({ folha, repetir, parada, style }: { folha: FolhaDeCosmetico; repetir: boolean; parada?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${folha.src})`,
        backgroundSize: `${folha.quadros * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        animation: parada ? 'none' : `cos-folha ${(folha.quadros / folha.fps).toFixed(3)}s steps(${folha.quadros}, jump-none) ${repetir ? 'infinite' : '1 forwards'}`,
        ...style,
      }}
    />
  );
}

/**
 * As duas camadas (atrás e na frente do herói) de uma aura ou de um efeito de entrada. Vai dentro da caixa `relative` do herói e se ancora nos pés dele: a
 * arte tem `lado` px com os pés em `pes`, desenhada para um herói de ~100 px de altura, então a camada mede `lado / 100` da altura da caixa.
 */
function Camadas({ arte, repetir, parada }: { arte: ArteEmCamadas; repetir: boolean; parada?: boolean }) {
  const tamanho = (arte.lado / ALTURA_DE_REFERENCIA) * 100;
  const caixa = (z: number): React.CSSProperties => ({ height: `${tamanho}%`, aspectRatio: '1 / 1', left: '50%', top: `${100 - (arte.pes[1] / ALTURA_DE_REFERENCIA) * 100}%`, transform: 'translateX(-50%)', zIndex: z });
  return (
    <>
      <style>{ESTILOS}</style>
      <div aria-hidden="true" className="absolute pointer-events-none" style={caixa(-1)}><Tira folha={arte.atras} repetir={repetir} parada={parada} /></div>
      <div aria-hidden="true" className="absolute pointer-events-none" style={caixa(20)}><Tira folha={arte.frente} repetir={repetir} parada={parada} /></div>
    </>
  );
}

/**
 * O efeito de entrada em combate de um cosmético (`efeito-<raridade>-<tema>`), para QUALQUER personagem: vai dentro da caixa `relative` do herói e se ancora
 * nos pés dele. `onRevelar`: avisa o instante em que o herói deve aparecer (o quadro de revelação; os primeiros quadros escondem o personagem).
 * `repetir`: toca em laço (a prévia da loja). Com "reduzir movimento" o efeito não toca e o herói aparece de uma vez.
 */
export function EfeitoDeEntrada({ id, repetir = false, onRevelar }: { id: string; repetir?: boolean; onRevelar?: () => void }) {
  const e = efeitoDeEntrada(id);
  const arte = arteDoEfeito(id);
  const [fim, setFim] = useState(false);
  const [parado, setParado] = useState(false);
  useEffect(() => {
    if (!e) return;
    const menos = usaMenosMovimento();
    setParado(menos);
    if (menos) {
      onRevelar?.();
      return;
    }
    const t1 = window.setTimeout(() => onRevelar?.(), e.revelacaoMs);
    const t2 = repetir ? undefined : window.setTimeout(() => setFim(true), e.duracaoMs + 150);
    return () => {
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [e, repetir]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!e || !arte || fim || parado) return null;
  return <Camadas arte={arte} repetir={repetir} />;
}

/** A aura de um personagem (`aura-<raridade>-<tema>`): um laço sem fim, uma camada atrás do herói e outra na frente. */
export function AuraDePersonagem({ id }: { id: string }) {
  const arte = arteDaAura(id);
  const [parada, setParada] = useState(false);
  useEffect(() => setParada(usaMenosMovimento()), []);
  if (!arte) return null;
  return <Camadas arte={arte} repetir parada={parada} />;
}

/**
 * Uma moldura de perfil animada da loja (`moldura-<raridade>-<tema>`), por cima do avatar. Vai numa caixa `relative` em que o rosto ocupa `rosto` da
 * largura (86%): a moldura é desenhada com o buraco de 52 px no centro do quadro de 128 px, então ela mede `rosto × 128 / 52` da caixa.
 */
export function MolduraAnimada({ id, rosto = 0.86 }: { id: string; rosto?: number }) {
  const arte = arteDaMoldura(id);
  const [parada, setParada] = useState(false);
  useEffect(() => setParada(usaMenosMovimento()), []);
  if (!arte) return null;
  const lado = (rosto * arte.lado) / arte.buraco;
  return (
    <div aria-hidden="true" className="absolute pointer-events-none" style={{ width: `${lado * 100}%`, height: `${lado * 100}%`, left: `${(0.5 - lado / 2) * 100}%`, top: `${(0.5 - lado / 2) * 100}%` }}>
      <style>{ESTILOS}</style>
      <Tira folha={arte} repetir parada={parada} />
    </div>
  );
}
