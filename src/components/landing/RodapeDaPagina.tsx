import React from 'react';
import { REDES_SOCIAIS } from '@/config/redesSociais';
import { BotaoPixel } from './BotaoPixel';

/** Chamada final e rodapé com as redes sociais (apagadas, com "em breve", até ter o endereço). */
export function RodapeDaPagina() {
  return (
    <footer className="w-full border-t-4 border-[#1A120B] bg-[#0D0D0D]/80 pt-12 pb-8 px-4 text-center">
      <p className="font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] text-sm sm:text-base leading-relaxed [text-shadow:0_3px_0_#7a4506]">Sua lenda começa agora</p>
      <div className="mt-6">
        <BotaoPixel href="/login">Entrar</BotaoPixel>
      </div>
      <ul className="mt-10 flex flex-wrap justify-center gap-3" aria-label="Redes sociais">
        {REDES_SOCIAIS.map((r) => (
          <li key={r.id}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="block border-2 border-[#B2A66C] bg-[#1C1B18] px-4 py-2 font-[family-name:var(--font-silk)] text-sm uppercase tracking-widest text-[#F5F3E0] hover:border-[#ED8A0C] hover:text-[#ED8A0C]">
                {r.nome}
              </a>
            ) : (
              <span className="block border-2 border-[#B2A66C]/30 px-4 py-2 font-[family-name:var(--font-silk)] text-sm uppercase tracking-widest text-[#B2A66C]/50" title="Em breve">
                {r.nome}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-10 font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#E2D6B6]">Realms of Nocthera · Projeto em desenvolvimento</p>
    </footer>
  );
}
