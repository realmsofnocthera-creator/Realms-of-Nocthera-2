import React from 'react';
import { PROVACOES } from '@/rules/provacoes';
import { PROVACOES_IMAGES } from '@/assets/provacoes';
import { CENAS_DAS_PROVACOES } from '@/assets/landing';
import { Revelar } from './Revelar';
import { TituloDeSecao } from './TituloDeSecao';

/** As Provações do jogo, com a cena e o nível em que abrem. */
export function ModosDeJogo() {
  return (
    <section aria-labelledby="secao-modos" className="py-4 sm:py-6">
      <TituloDeSecao id="secao-modos" titulo="Provações" subtitulo="Cada desafio abre em um nível" />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PROVACOES.map((p, i) => (
          <li key={p.id}>
            <Revelar atraso={(i % 3) * 0.1}>
              <article className="relative aspect-video overflow-hidden bg-[#1C1B18]">
                {CENAS_DAS_PROVACOES[p.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={CENAS_DAS_PROVACOES[p.id]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[50%_35%]" draggable={false} />
                ) : (
                  p.assetKey && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={PROVACOES_IMAGES[p.assetKey]} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                  )
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0D0D0D]/95 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 px-5 pb-4 flex items-end justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-pixel)] text-[10px] uppercase leading-relaxed text-[#F5F3E0] [text-shadow:0_2px_0_#1A120B]">{p.nome}</h3>
                  <span className="shrink-0 font-[family-name:var(--font-silk)] text-xs uppercase text-[#ED8A0C] [text-shadow:0_2px_0_#1A120B]">Nv {p.nivelRequerido}</span>
                </div>
              </article>
            </Revelar>
          </li>
        ))}
      </ul>
    </section>
  );
}
