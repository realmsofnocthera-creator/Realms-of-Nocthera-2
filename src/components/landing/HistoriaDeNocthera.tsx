import React from 'react';
import { DEUSES_DA_PAGINA } from '@/assets/landing';
import { Revelar } from './Revelar';
import { TituloDeSecao } from './TituloDeSecao';

const ERAS = [
  { id: 'ouro', nome: 'Era de Ouro', texto: 'Os deuses caminhavam entre os mortais. Restaram apenas ruínas e lendas.', cor: '#ED8A0C' },
  { id: 'prata', nome: 'Era de Prata', texto: 'A ascensão dos homens.', cor: '#D5C7A4' },
  { id: 'bronze', nome: 'Era de Bronze', texto: 'O poder que restou é disputado por reinos, raças e criaturas de doze mundos diferentes.', cor: '#B2713A' },
] as const;

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
      <Revelar className="mt-10">
        <p className="text-center font-[family-name:var(--font-silk)] text-xs uppercase tracking-[0.2em] text-[#B2A66C] mb-5">Os seis deuses</p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
          {DEUSES_DA_PAGINA.map((d) => (
            <li key={d.id} className="border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C] bg-gradient-to-b from-[#1C1B18] to-[#0D0D0D] overflow-hidden">
              <div className="relative aspect-[2/3] w-full">
                {d.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.src}
                    alt={d.nome}
                    loading="lazy"
                    draggable={false}
                    className={`absolute inset-0 w-full h-full pointer-events-none ${d.cartao ? 'object-cover object-top' : 'object-contain object-bottom p-1'}`}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#B2A66C]/80">Em breve</span>
                )}
              </div>
              <p className="py-2 text-center font-[family-name:var(--font-pixel)] text-[10px] sm:text-[11px] uppercase text-[#F5F3E0] border-t-2 border-[#1A120B] bg-[#120F0C]">{d.nome}</p>
            </li>
          ))}
        </ul>
      </Revelar>
    </section>
  );
}
