'use client';

import React, { useEffect, useState } from 'react';
import { EFEITOS, PASTA_DOS_EFEITOS } from '@/assets/efeitosPixelfx';
import { efeitoDeEntrada } from '@/rules/efeitosDeEntrada';

const ESTILOS = `
@keyframes ee-folha { from { background-position-x: 0%; } to { background-position-x: 100%; } }
@keyframes ee-anel { 0% { transform: translate(-50%, 50%) scale(.2); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(-50%, 50%) scale(1.5); opacity: 0; } }
@keyframes ee-flash { 0% { opacity: 0; } 8% { opacity: .95; } 22% { opacity: .15; } 30% { opacity: .7; } 100% { opacity: 0; } }
@keyframes ee-raio { 0% { transform: scaleY(0); opacity: 0; } 10% { transform: scaleY(1); opacity: 1; } 45% { opacity: .9; } 100% { transform: scaleY(1); opacity: 0; } }
@keyframes ee-vortice { 0% { transform: translate(-50%, -50%) scale(.1) rotate(0deg); opacity: 0; } 25% { opacity: .95; } 100% { transform: translate(-50%, -50%) scale(1.25) rotate(540deg); opacity: 0; } }
@keyframes ee-coluna { 0% { transform: translateX(-50%) scaleY(0); opacity: 0; } 18% { transform: translateX(-50%) scaleY(1); opacity: .95; } 70% { opacity: .75; } 100% { transform: translateX(-50%) scaleY(1); opacity: 0; } }
@keyframes ee-sobe { 0% { transform: translate(0, 0) scale(1); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(var(--dx), -165%) scale(.3); opacity: 0; } }
@keyframes ee-estilhaco { 0% { transform: translate(-50%, -50%) scale(.2); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(var(--giro)); opacity: 0; } }
@keyframes ee-espiral { 0% { transform: translate(-50%, 50%) scale(.3) rotate(0deg); opacity: 0; } 20% { opacity: .9; } 100% { transform: translate(-50%, 50%) scale(1.4) rotate(720deg); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ee-camada { animation-duration: 1ms !important; animation-delay: 0ms !important; } .ee-folha { animation: none !important; } }
`;

/**
 * O efeito de entrada em combate de um cosmético (`efeito-<raridade>-<tema>`), para QUALQUER personagem: ele se centra no pai (o herói) e o tamanho
 * acompanha a altura do pai, sem depender do sprite da classe. `repetir`: toca em laço (a prévia da loja). O pai precisa ser `relative` ou `absolute`.
 */
export function EfeitoDeEntrada({ id, repetir = false, escala = 1.6 }: { id: string; repetir?: boolean; escala?: number }) {
  const e = efeitoDeEntrada(id);
  const [fim, setFim] = useState(false);
  useEffect(() => {
    if (!e || repetir) return;
    const t = window.setTimeout(() => setFim(true), e.duracaoMs + 200);
    return () => window.clearTimeout(t);
  }, [e, repetir]);
  if (!e || fim) return null;
  const fx = EFEITOS[e.fx];
  const d = e.duracaoMs;
  const rep = repetir ? 'infinite' : '1';
  const anim = (nome: string, extra = '', ms = d) => `${nome} ${ms}ms ${extra || 'ease-out'} ${rep} both`;
  const tem = (c: (typeof e.camadas)[number]) => e.camadas.includes(c);
  return (
    <div aria-hidden="true" className="absolute left-1/2 top-1/2 pointer-events-none" style={{ height: `${escala * 100}%`, aspectRatio: '1 / 1', transform: 'translate(-50%, -52%)', zIndex: 20 }}>
      <style>{ESTILOS}</style>
      {tem('flash') && <div className="ee-camada absolute inset-[-40%] rounded-full" style={{ background: `radial-gradient(circle, ${e.claro} 0%, ${e.cor}88 35%, transparent 65%)`, animation: anim('ee-flash', 'linear') }} />}
      {tem('vortice') && <div className="ee-camada absolute left-1/2 top-1/2 w-[110%] h-[110%] rounded-full" style={{ background: `conic-gradient(from 0deg, transparent, ${e.cor}cc, transparent 30%, ${e.claro}99 55%, transparent 80%, ${e.cor}cc)`, maskImage: 'radial-gradient(circle, transparent 18%, #000 40%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, transparent 18%, #000 40%, transparent 70%)', animation: anim('ee-vortice', 'ease-in-out') }} />}
      {tem('espiral') && [0, 1, 2].map((k) => <div key={k} className="ee-camada absolute left-1/2 bottom-[8%] w-[80%] h-[34%] rounded-[50%]" style={{ border: `3px solid ${e.cor}`, borderTopColor: 'transparent', borderLeftColor: 'transparent', boxShadow: `0 0 10px ${e.claro}`, animation: anim('ee-espiral', 'ease-out', d), animationDelay: `${k * 160}ms` }} />)}
      {tem('coluna') && <div className="ee-camada absolute left-1/2 bottom-[6%] w-[26%] h-[92%] origin-bottom" style={{ background: `linear-gradient(0deg, ${e.cor}ee, ${e.claro}aa 45%, transparent)`, filter: `drop-shadow(0 0 10px ${e.cor})`, clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)', animation: anim('ee-coluna') }} />}
      {tem('raios') && [18, 50, 78].map((x, k) => <div key={x} className="ee-camada absolute top-0 origin-top" style={{ left: `${x}%`, width: 5, height: '70%', background: `linear-gradient(180deg, ${e.claro}, ${e.cor})`, boxShadow: `0 0 12px ${e.cor}`, clipPath: 'polygon(40% 0, 100% 0, 60% 45%, 100% 45%, 20% 100%, 45% 55%, 0 55%)', animation: anim('ee-raio', 'linear'), animationDelay: `${k * 140}ms` }} />)}
      {tem('anel') && <div className="ee-camada absolute left-1/2 bottom-[10%] w-[78%] h-[26%] rounded-[50%]" style={{ border: `3px solid ${e.cor}`, boxShadow: `0 0 14px ${e.cor}, inset 0 0 12px ${e.claro}66`, animation: anim('ee-anel') }} />}
      {/* a folha de quadros do pixelfx, no centro */}
      <div className="ee-folha absolute left-1/2 top-1/2" style={{ width: '112%', aspectRatio: `${fx.largura} / ${fx.altura}`, transform: 'translate(-50%, -50%)', backgroundImage: `url(${PASTA_DOS_EFEITOS}${e.fx}.webp)`, backgroundSize: `${fx.quadros * 100}% 100%`, backgroundRepeat: 'no-repeat', imageRendering: 'pixelated', mixBlendMode: 'screen', filter: `saturate(1.4) drop-shadow(0 0 6px ${e.cor})`, animation: `ee-folha ${(fx.quadros / fx.fps).toFixed(2)}s steps(${fx.quadros - 1}, jump-none) ${rep}` }} />
      {tem('estilhacos') && [0, 1, 2, 3, 4, 5].map((k) => <span key={k} className="ee-camada absolute left-1/2 top-1/2 w-2.5 h-3.5" style={{ ['--dx' as string]: `${(k - 2.5) * 22}px`, ['--dy' as string]: `${-30 - (k % 3) * 22}px`, ['--giro' as string]: `${k * 60}deg`, background: `linear-gradient(135deg, ${e.claro}, ${e.cor})`, clipPath: 'polygon(50% 0, 100% 60%, 50% 100%, 0 60%)', boxShadow: `0 0 6px ${e.cor}`, animation: anim('ee-estilhaco'), animationDelay: `${k * 60}ms` }} />)}
      {(tem('brasas') || tem('folhas') || tem('penas')) && [0, 1, 2, 3, 4, 5, 6].map((k) => <span key={k} className="ee-camada absolute bottom-[14%]" style={{ left: `${24 + k * 8.5}%`, ['--dx' as string]: `${(k % 2 ? 1 : -1) * (8 + k * 3)}px`, width: tem('brasas') ? 5 : 7, height: tem('brasas') ? 5 : 9, background: tem('brasas') ? e.cor : e.claro, boxShadow: `0 0 8px ${e.cor}`, borderRadius: tem('folhas') ? '60% 0 60% 0' : tem('penas') ? '50% 50% 0 50%' : '1px', animation: anim('ee-sobe', 'ease-out', d), animationDelay: `${k * 150}ms` }} />)}
    </div>
  );
}
