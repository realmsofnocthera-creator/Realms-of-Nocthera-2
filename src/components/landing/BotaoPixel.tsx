import React from 'react';
import Link from 'next/link';

/** Botão com a moldura de metal em pixel (9 partes), com 3 estados: normal, passando o mouse e apertado (ver `.botao-pixel`). */
export function BotaoPixel({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="botao-pixel inline-block min-w-[240px] text-center font-[family-name:var(--font-pixel)] text-[11px] sm:text-xs uppercase tracking-wider text-[#F5F3E0] px-4 py-3 hover:text-[#FFD27A] active:text-[#B2A66C] active:translate-y-[2px]"
    >
      {children}
    </Link>
  );
}
