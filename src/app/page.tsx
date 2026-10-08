'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { RACES } from '@/rules/races';
import { CLASSES } from '@/rules/classes';
import { RACE_ICONS, CLASS_ICONS } from '@/assets/icons';
import { SectionDivider } from '@/components/landing/SectionDivider';
import { EntityCarousel, EntityCarouselItem } from '@/components/landing/EntityCarousel';
import { CombatFlowDiagram } from '@/components/landing/CombatFlowDiagram';

/**
 * Resume um texto descritivo em até 1-2 frases para exibição limpa nos cards do carrossel.
 */
function summarizeDescription(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, 2).join(' ');
}

const RACE_CAROUSEL_ITEMS: ReadonlyArray<EntityCarouselItem> = RACES.map((race) => ({
  id: race.id,
  nome: race.nome,
  iconeUrl: RACE_ICONS[race.id] || race.iconeUrl || '',
  descricaoCurta: summarizeDescription(race.descricao),
}));

const CLASS_CAROUSEL_ITEMS: ReadonlyArray<EntityCarouselItem> = CLASSES.map((cls) => ({
  id: cls.id,
  nome: cls.nome,
  iconeUrl: CLASS_ICONS[cls.id] || '',
  descricaoCurta: summarizeDescription(cls.descricao),
}));

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full text-[#F5F3E0] flex flex-col justify-between overflow-x-hidden">
      {/* FUNDO CONTÍNUO FIXO EM TODA A VIEWPORT (PARALLAX SIMPLES) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/landing-bg.jpg')" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing-bg.jpg"
          alt="Paisagem sombria de Realms of Nocthera"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center select-none pointer-events-none"
        />
        {/* Overlay escuro em gradiente calibrado para garantir legibilidade em todas as seções sem caixa de fundo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D]/55 via-[#120F0C]/72 to-[#0D0D0D]/82" />
      </div>

      {/* CONTEÚDO ROLÁVEL SOBRE O FUNDO FIXO */}
      <div className="relative z-10 flex flex-col flex-1 justify-between">
        {/* 1. HERO */}
        <section className="min-h-[88vh] w-full flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full max-w-3xl mx-auto text-center px-2 py-6 sm:px-6 sm:py-10"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-cinzel font-bold tracking-widest text-[#ED8A0C] uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] border-b border-[#B2A66C]/40 pb-5 sm:pb-6">
              Realms of Nocthera
            </h1>

            <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-5 text-sm sm:text-base md:text-lg text-[#F5F3E0] leading-relaxed max-w-2xl mx-auto">
              <p className="text-[#E2D6B6] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                Nocthera é um mundo que já viu seus deuses partirem. Da Era de Ouro, quando Lautrec, Lana, Azgher, Nimb, Yggdrasil e Gwyndolin caminhavam entre os mortais, restaram apenas ruínas e lendas. A Era de Prata trouxe a ascensão dos homens. Hoje, na Era de Bronze, o poder que restou é disputado por reinos, raças e criaturas de doze mundos diferentes.
              </p>
              <p className="text-[#F5F3E0] font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                Crie seu personagem, escolha seu caminho entre seis povos e seis vocações, e forje sua própria história neste universo sombrio.
              </p>
            </div>

            <div className="mt-8 sm:mt-10">
              <Link
                href="/login"
                className="inline-block w-full sm:w-auto min-w-[220px] font-cinzel font-bold tracking-widest uppercase text-sm sm:text-base text-[#0D0D0D] bg-[#ED8A0C] hover:bg-[#F58C0C] border border-[#D5C7A4]/60 px-10 py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-[0_4px_25px_rgba(237,138,12,0.35)] hover:shadow-[0_4px_34px_rgba(245,140,12,0.55)] whitespace-nowrap"
              >
                Entrar
              </Link>
            </div>
          </motion.div>
        </section>

        {/* CORPO PRINCIPAL EM CAPÍTULOS (SEM FUNDO SÓLIDO) */}
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionDivider />

          {/* 2. SEÇÃO "ESCOLHA SEU POVO" (RAÇAS) */}
          <motion.section
            aria-labelledby="section-races"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="py-4 sm:py-6"
          >
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h2
                id="section-races"
                className="text-2xl sm:text-3xl font-cinzel font-bold text-[#ED8A0C] tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
              >
                Escolha seu Povo
              </h2>
              <p className="text-xs sm:text-sm text-[#E2D6B6] mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Seis povos com origens, atributos e passivas raciais distintas.
              </p>
            </div>

            <EntityCarousel
              items={RACE_CAROUSEL_ITEMS}
              ariaLabel="Carrossel de Raças de Realms of Nocthera"
            />
          </motion.section>

          <SectionDivider />

          {/* 3. SEÇÃO "ESCOLHA SEU CAMINHO" (CLASSES) */}
          <motion.section
            aria-labelledby="section-classes"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="py-4 sm:py-6"
          >
            <div className="text-center max-w-2xl mx-auto mb-6">
              <h2
                id="section-classes"
                className="text-2xl sm:text-3xl font-cinzel font-bold text-[#ED8A0C] tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
              >
                Escolha seu Caminho
              </h2>
              <p className="text-xs sm:text-sm text-[#E2D6B6] mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Seis vocações de combate com progressão própria ao longo dos níveis.
              </p>
            </div>

            <EntityCarousel
              items={CLASS_CAROUSEL_ITEMS}
              ariaLabel="Carrossel de Classes de Realms of Nocthera"
            />
          </motion.section>

          <SectionDivider />

          {/* 4. SEÇÃO "SISTEMA DE COMBATE" */}
          <motion.section
            aria-labelledby="section-combat"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="py-4 sm:py-6"
          >
            <div className="space-y-6">
              <div className="text-center max-w-3xl mx-auto">
                <h2
                  id="section-combat"
                  className="text-2xl sm:text-3xl font-cinzel font-bold text-[#ED8A0C] tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
                >
                  Sistema de Combate
                </h2>

                <p className="mt-5 text-sm sm:text-base text-[#E2D6B6] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  O combate em Realms of Nocthera é automático: seu personagem luta sozinho, aplicando dano físico ou mágico conforme sua classe e progredindo em poder à medida que sobe de nível. Cada classe desenvolve habilidades próprias ao longo da jornada — de golpes básicos a técnicas devastadoras desbloqueadas nos níveis mais altos. A defesa combina Sobreescudo e resistência física ou mágica, e cada escolha de raça e classe molda um estilo de luta diferente.
                </p>
              </div>

              <CombatFlowDiagram />
            </div>
          </motion.section>

          <SectionDivider />
        </div>

        {/* 5. RODAPÉ SIMPLES */}
        <footer className="w-full border-t border-[#B2A66C]/30 bg-[#0D0D0D]/55 backdrop-blur-xs py-6 px-4 text-center mt-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-[#D5C7A4]">
            <span className="font-cinzel font-bold tracking-widest uppercase text-[#ED8A0C]">
              Realms of Nocthera
            </span>
            <span className="text-[#E2D6B6]">
              Projeto em desenvolvimento
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}



