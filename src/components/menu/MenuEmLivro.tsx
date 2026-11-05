'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CharacterDocument } from '@/server/characterService';
import { MenuScreen } from './MenuScreen';

export interface MenuEmLivroProps {
  aberto: boolean;
  onFechar: () => void;
  personagem: CharacterDocument;
}

/**
 * O Menu como painel sobre o Hub: abre e fecha como a capa de um livro, girando em volta da lombada (borda esquerda).
 * Quem usa decide o histórico do navegador; aqui só a animação, o fundo escurecido e o Esc.
 */
export function MenuEmLivro({ aberto, onFechar, personagem }: MenuEmLivroProps) {
  const semMovimento = useReducedMotion();

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  const fechado = semMovimento ? { opacity: 0 } : { rotateY: -105, x: -28, opacity: 0 };
  const aberta = semMovimento ? { opacity: 1 } : { rotateY: 0, x: 0, opacity: 1 };

  return (
    <AnimatePresence>
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6"
          style={{ perspective: 1800 }}
        >
          <motion.div
            aria-hidden="true"
            onClick={onFechar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={fechado}
            animate={aberta}
            exit={fechado}
            transition={{
              rotateY: { duration: 0.65, ease: [0.22, 0.8, 0.28, 1] },
              x: { duration: 0.65, ease: [0.22, 0.8, 0.28, 1] },
              opacity: { duration: 0.25 },
            }}
            style={{ transformOrigin: 'left center', backfaceVisibility: 'hidden' }}
            className="relative flex w-full max-w-[500px] h-[92dvh] shadow-[0_18px_60px_rgba(0,0,0,0.9)]"
          >
            {/* Lombada do livro: couro escuro com filete dourado e rebites */}
            <div
              aria-hidden="true"
              className="relative w-3 sm:w-4 shrink-0 border-2 border-r-0 border-[#1A120B] rounded-l-sm"
              style={{
                background:
                  'linear-gradient(90deg, #2B1810 0%, #4A2A18 55%, #33200F 100%)',
                boxShadow: 'inset -2px 0 0 #B2A66C',
              }}
            >
              {[12, 50, 88].map((topo) => (
                <span
                  key={topo}
                  className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#ED8A0C] shadow-[0_0_0_1px_#1A120B]"
                  style={{ top: `${topo}%` }}
                />
              ))}
            </div>
            {/* A página: o próprio Menu */}
            <div className="relative flex-1 min-w-0 border-2 border-[#1A120B] outline outline-2 -outline-offset-4 outline-[#B2A66C]/70 overflow-hidden rounded-r-sm bg-[#0D0D0D]">
              <MenuScreen personagem={personagem} onFechar={onFechar} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
