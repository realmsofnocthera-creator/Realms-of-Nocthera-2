import React from 'react';
import Link from 'next/link';

/** Botão de borda "quebrada" em pixel, com 3 estados (normal, passando o mouse, apertado). */
export function BotaoPixel({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block min-w-[220px] text-center font-[family-name:var(--font-pixel)] text-[11px] sm:text-xs uppercase tracking-wider text-[#0D0D0D] bg-[#ED8A0C] hover:bg-[#F58C0C] active:translate-y-[3px] px-8 py-4 border-4 border-[#1A120B] shadow-[0_4px_0_#7a4506,0_0_0_2px_#D5C7A4] hover:shadow-[0_4px_0_#7a4506,0_0_0_2px_#ffd28a,0_0_26px_rgba(237,138,12,0.55)] active:shadow-[0_1px_0_#7a4506,0_0_0_2px_#D5C7A4] transition-[box-shadow,background-color] duration-100"
    >
      {children}
    </Link>
  );
}
