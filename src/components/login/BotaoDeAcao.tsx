import React from 'react';

interface BotaoDeAcaoProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /** "cheio" ocupa a largura toda (formulários); "pequeno" é um botão de texto curto. */
  largura?: 'cheio' | 'pequeno';
}

/** Botão de metal em pixel (mesma moldura de 3 estados da página inicial), para botões de formulário. */
export function BotaoDeAcao({ largura = 'cheio', children, type = 'button', ...resto }: BotaoDeAcaoProps) {
  return (
    <button
      type={type}
      {...resto}
      className={`botao-pixel botao-pixel-medio ${largura === 'cheio' ? 'w-full' : 'min-w-[160px]'} text-center font-[family-name:var(--font-pixel)] text-[10px] sm:text-[11px] uppercase tracking-wider text-[#F5F3E0] px-2 py-2 hover:text-[#FFD27A] active:text-[#B2A66C] active:translate-y-[2px] disabled:hover:text-[#F5F3E0] disabled:active:translate-y-0`}
    >
      {children}
    </button>
  );
}
