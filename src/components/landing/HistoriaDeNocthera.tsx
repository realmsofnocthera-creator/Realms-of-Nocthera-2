import React from 'react';
import { Revelar } from './Revelar';
import { TituloDeSecao } from './TituloDeSecao';

const ERAS = [
  { id: 'ouro', nome: 'Era de Ouro', texto: 'Os deuses caminhavam entre os mortais. Restaram apenas ruínas e lendas.', cor: '#ED8A0C' },
  { id: 'prata', nome: 'Era de Prata', texto: 'A ascensão dos homens.', cor: '#D5C7A4' },
  { id: 'bronze', nome: 'Era de Bronze', texto: 'O poder que restou é disputado por reinos, raças e criaturas de doze mundos diferentes.', cor: '#B2713A' },
] as const;

const DEUSES = ['Lautrec', 'Lana', 'Azgher', 'Nimb', 'Yggdrasil', 'Gwyndolin'] as const;

/** A história resumida: as 3 Eras e os 6 Deuses (só com o que já está nos textos do jogo). */
export function HistoriaDeNocthera() {
  return (
    <section aria-labelledby="secao-historia" className="py-4 sm:py-6">
      <TituloDeSecao id="secao-historia" titulo="Um mundo sem deuses" subtitulo="Nocthera já viu seus deuses partirem" />
      <div className="grid gap-5 md:grid-cols-3">
        {ERAS.map((era, i) => (
          <Revelar key={era.id} atraso={i * 0.12}>
            <article className="h-full border-4 border-[#1A120B] bg-[#1C1B18]/80 p-5 text-center shadow-[0_0_0_2px_var(--cor)]" style={{ ['--cor' as string]: era.cor }}>
              <h3 className="font-[family-name:var(--font-pixel)] text-[11px] sm:text-xs uppercase leading-relaxed" style={{ color: era.cor }}>
                {era.nome}
              </h3>
              <p className="mt-4 text-sm text-[#E2D6B6] leading-relaxed">{era.texto}</p>
            </article>
          </Revelar>
        ))}
      </div>
      <Revelar className="mt-8">
        <p className="text-center font-[family-name:var(--font-silk)] text-xs uppercase tracking-[0.2em] text-[#B2A66C] mb-4">Os seis deuses</p>
        <ul className="flex flex-wrap justify-center gap-3">
          {DEUSES.map((d) => (
            <li key={d} className="border-2 border-[#B2A66C]/70 bg-[#120F0C]/80 px-4 py-2 font-[family-name:var(--font-silk)] text-sm uppercase tracking-widest text-[#F5F3E0]">
              {d}
            </li>
          ))}
        </ul>
      </Revelar>
    </section>
  );
}
