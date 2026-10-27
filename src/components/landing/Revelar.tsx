'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EM_DEGRAUS = (t: number) => Math.floor(t * 6) / 6;

/** Faz o bloco aparecer ao rolar, subindo "em degraus" (combina com o pixel). Parado se o aparelho pede menos movimento. */
export function Revelar({ children, className, atraso = 0 }: { children: React.ReactNode; className?: string; atraso?: number }) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: atraso, ease: EM_DEGRAUS }}
    >
      {children}
    </motion.div>
  );
}
