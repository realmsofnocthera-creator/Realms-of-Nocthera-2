'use client';

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { CAMADAS_DO_TOPO, HEROI_DO_TOPO, LOGO_DA_PAGINA_INICIAL, type CamadaDoTopo } from '@/assets/landing';
import { Brasas } from './Brasas';
import { BotaoPixel } from './BotaoPixel';

function Camada({ camada, rolagem, parar }: { camada: CamadaDoTopo; rolagem: MotionValue<number>; parar: boolean }) {
  const y = useTransform(rolagem, [0, 1], [0, parar ? 0 : camada.velocidade * 320]);
  if (!camada.src) return null;
  return (
    <motion.div aria-hidden="true" className="absolute inset-x-0 -top-10 -bottom-10" style={{ y }}>
      <picture className="block w-full h-full">
        {camada.srcAvif && <source srcSet={camada.srcAvif} type="image/avif" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={camada.src} alt="" draggable={false} className={`w-full h-full object-cover select-none ${camada.pixel === false ? '' : '[image-rendering:pixelated]'}`} style={{ objectPosition: camada.posicao ?? 'center' }} />
      </picture>
    </motion.div>
  );
}

/** Topo da página: arte em camadas com parallax, brasas, logo em pixel, texto curto e botão. */
export function TopoDaPagina() {
  const ref = useRef<HTMLElement>(null);
  const reduzir = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  return (
    <section ref={ref} className="relative min-h-[100svh] w-full overflow-hidden flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      {CAMADAS_DO_TOPO.map((c) => (
        <Camada key={c.id} camada={c} rolagem={scrollYProgress} parar={reduzir} />
      ))}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D]/50 via-[#120F0C]/55 to-[#0D0D0D]" />
      <Brasas />

      <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
        {HEROI_DO_TOPO && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={HEROI_DO_TOPO} alt="" className="mx-auto mb-6 w-24 [image-rendering:pixelated]" />
        )}
        <h1 className="nocthera-brilho">
          {LOGO_DA_PAGINA_INICIAL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_DA_PAGINA_INICIAL} alt="Realms of Nocthera" className="mx-auto w-full max-w-xl drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]" />
          ) : (
            <span className="block font-[family-name:var(--font-pixel)] uppercase text-[#ED8A0C] leading-[1.6] text-xl sm:text-4xl md:text-5xl [text-shadow:0_4px_0_#7a4506,0_0_30px_rgba(0,0,0,0.9)]">
              Realms
              <span className="block text-[#F5F3E0] text-sm sm:text-xl md:text-2xl [text-shadow:0_3px_0_#1A120B]">of</span>
              Nocthera
            </span>
          )}
        </h1>

        <p className="mt-8 font-[family-name:var(--font-silk)] text-sm sm:text-base uppercase tracking-[0.2em] text-[#E2D6B6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          Um RPG online de dark fantasy
        </p>
        <p className="mt-5 text-sm sm:text-base md:text-lg text-[#F5F3E0] leading-relaxed max-w-2xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
          Crie seu personagem, escolha seu caminho entre seis povos e seis vocações, e forje sua própria história neste universo sombrio.
        </p>

        <div className="mt-10">
          <BotaoPixel href="/login">Entrar</BotaoPixel>
        </div>
        <p className="mt-10 font-[family-name:var(--font-silk)] text-xs uppercase tracking-widest text-[#B2A66C] nocthera-pisca" aria-hidden="true">
          ▼ role para descobrir
        </p>
      </div>
    </section>
  );
}
