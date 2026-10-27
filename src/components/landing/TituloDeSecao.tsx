import React from 'react';

/** Título de capítulo em fonte pixel, com um subtítulo curto em Silkscreen. */
export function TituloDeSecao({ id, titulo, subtitulo }: { id: string; titulo: string; subtitulo?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-8">
      <h2
        id={id}
        className="font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] leading-relaxed text-base sm:text-xl md:text-2xl [text-shadow:0_3px_0_#7a4506,0_0_24px_rgba(0,0,0,0.95)]"
      >
        {titulo}
      </h2>
      {subtitulo && (
        <p className="mt-4 font-[family-name:var(--font-silk)] text-xs sm:text-sm uppercase tracking-[0.18em] text-[#E2D6B6] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          {subtitulo}
        </p>
      )}
    </div>
  );
}
