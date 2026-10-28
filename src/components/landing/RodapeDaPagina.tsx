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
      <ul className="mt-10 flex flex-wrap justify-center gap-1.5 sm:gap-4" aria-label="Redes sociais">
        {REDES_SOCIAIS.map((r) => {
          // eslint-disable-next-line @next/next/no-img-element
          const icone = <img src={`/images/redes/${r.id}.png`} alt="" width={48} height={48} draggable={false} className="w-12 h-12 [image-rendering:pixelated]" />;
          return (
            <li key={r.id}>
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={r.nome}
                  title={r.nome}
                  className="block p-0.5 sm:p-1 transition-transform duration-100 hover:-translate-y-1 active:translate-y-0 hover:drop-shadow-[0_0_10px_rgba(237,138,12,0.7)]"
                >
                  {icone}
                </a>
              ) : (
                <span aria-label={`${r.nome} (em breve)`} title="Em breve" className="block p-0.5 sm:p-1 opacity-35 grayscale">
                  {icone}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-10 font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#E2D6B6]">Realms of Nocthera · Projeto em desenvolvimento</p>
    </footer>
  );
}
