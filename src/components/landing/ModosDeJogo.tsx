import React from 'react';
import { PROVACOES } from '@/rules/provacoes';
import { PROVACOES_IMAGES } from '@/assets/provacoes';
import { Revelar } from './Revelar';
import { TituloDeSecao } from './TituloDeSecao';

/** As Provações do jogo, com a arte e o nível em que abrem (a arte já traz o título; sem arte, o nome aparece escrito). */
export function ModosDeJogo() {
  return (
    <section aria-labelledby="secao-modos" className="py-4 sm:py-6">
      <TituloDeSecao id="secao-modos" titulo="Provações" subtitulo="Cada desafio abre em um nível" />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PROVACOES.map((p, i) => (
          <li key={p.id}>
            <Revelar atraso={(i % 3) * 0.1}>
              <article className="relative h-40 overflow-hidden border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C] bg-[#1C1B18]">
                {p.assetKey && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={PROVACOES_IMAGES[p.assetKey]} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/30 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between gap-2">
                  <h3 className={`font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0] [text-shadow:0_2px_0_#1A120B] ${p.assetKey ? 'sr-only' : ''}`}>{p.nome}</h3>
                  <span className="shrink-0 font-[family-name:var(--font-silk)] text-xs uppercase text-[#ED8A0C]">Nv {p.nivelRequerido}</span>
                </div>
              </article>
            </Revelar>
          </li>
        ))}
      </ul>
    </section>
  );
}
