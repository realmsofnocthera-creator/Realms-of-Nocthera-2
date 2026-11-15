'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TEXTOS_DA_CACADA as T } from '@/rules/textosDaCacada';

export const TINTA = '#582914';

/** Botão de pixel (madeira escura com friso dourado), no estilo do kit do livro. */
export function BotaoPixel({ children, aoClicar, desligado, destaque, rotulo, className = '' }: { children: React.ReactNode; aoClicar: () => void; desligado?: boolean; destaque?: boolean; rotulo?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desligado}
      aria-label={rotulo}
      className={`px-[4cqw] py-[1.8cqw] font-cinzel font-black uppercase tracking-wider text-[3.2cqw] leading-none border-[0.6cqw] cursor-pointer enabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-[0.6cqw] focus-visible:outline-[#6FE3EE] ${className}`}
      style={{
        color: '#FFE9B0',
        borderColor: destaque ? '#F3C769' : '#2A0F0A',
        background: destaque ? 'linear-gradient(#B3261E, #6E130F)' : 'linear-gradient(#5A3320, #34190F)',
        boxShadow: 'inset 0 0 0 0.4cqw rgba(243,199,105,0.55), 0 0.6cqw 0 #1A0805',
        textShadow: '0.3cqw 0.3cqw 0 #1A0805',
      }}
    >
      {children}
    </button>
  );
}

/** Uma janela de pergaminho por cima do livro (a ficha do monstro e o resultado da caçada). */
export function JanelaDaCacada({ titulo, aoFechar, children }: { titulo: string; aoFechar?: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!aoFechar) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  if (typeof document === 'undefined') return null;
  // a janela sai do livro (que é um "container") para cobrir a tela inteira; ela mesma é um container, então os cqw seguem valendo
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65" role="presentation" onClick={aoFechar}>
      <div className="px-[4cqw] max-h-full flex items-center" style={{ containerType: 'inline-size', width: 'min(100vw, 640px)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[86%] overflow-y-auto flex flex-col gap-[2.4cqw] p-[4cqw] border-[0.9cqw]"
        style={{ background: 'linear-gradient(#EBD2A2, #D9B677)', borderColor: '#2A0F0A', color: TINTA, boxShadow: 'inset 0 0 0 0.6cqw #B8832E, 0 1cqw 0 #1A0805' }}
      >
        <h2 className="text-center font-cinzel font-black uppercase tracking-widest text-[4.2cqw] leading-tight">{titulo}</h2>
        {children}
        {aoFechar && (
          <div className="flex justify-center pt-[1cqw]">
            <BotaoPixel aoClicar={aoFechar} destaque>{T.fechar}</BotaoPixel>
          </div>
        )}
      </div>
      </div>
    </div>,
    document.body
  );
}
