'use client';

import React from 'react';
import { RACES } from '@/rules/races';
import { CLASSES } from '@/rules/classes';
import { RACE_ICONS, CLASS_ICONS } from '@/assets/icons';
import { WIZARD_RACE_IMAGES, WIZARD_CLASS_IMAGES } from '@/assets/wizard';
import { SectionDivider } from '@/components/landing/SectionDivider';
import { EntityCarousel, EntityCarouselItem } from '@/components/landing/EntityCarousel';
import { CombatFlowDiagram } from '@/components/landing/CombatFlowDiagram';
import { TopoDaPagina } from '@/components/landing/TopoDaPagina';
import { HistoriaDeNocthera } from '@/components/landing/HistoriaDeNocthera';
import { ModosDeJogo } from '@/components/landing/ModosDeJogo';
import { RodapeDaPagina } from '@/components/landing/RodapeDaPagina';
import { Revelar } from '@/components/landing/Revelar';
import { TituloDeSecao } from '@/components/landing/TituloDeSecao';

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
  imagemUrl: WIZARD_RACE_IMAGES[race.id],
  descricaoCurta: summarizeDescription(race.descricao),
}));

const CLASS_CAROUSEL_ITEMS: ReadonlyArray<EntityCarouselItem> = CLASSES.map((cls) => ({
  id: cls.id,
  nome: cls.nome,
  iconeUrl: CLASS_ICONS[cls.id] || '',
  imagemUrl: WIZARD_CLASS_IMAGES[cls.id],
  descricaoCurta: summarizeDescription(cls.descricao),
}));

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full text-[#F5F3E0] overflow-x-hidden bg-[#0D0D0D]">
      <TopoDaPagina />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <HistoriaDeNocthera />
        <SectionDivider />

        <section aria-labelledby="section-races" className="py-4 sm:py-6">
          <Revelar>
            <TituloDeSecao id="section-races" titulo="Escolha seu Povo" subtitulo="Seis povos com origens, atributos e passivas raciais distintas" />
            <EntityCarousel items={RACE_CAROUSEL_ITEMS} ariaLabel="Carrossel de Raças de Realms of Nocthera" />
          </Revelar>
        </section>

        <SectionDivider />

        <section aria-labelledby="section-classes" className="py-4 sm:py-6">
          <Revelar>
            <TituloDeSecao id="section-classes" titulo="Escolha seu Caminho" subtitulo="Seis vocações de combate com progressão própria" />
            <EntityCarousel items={CLASS_CAROUSEL_ITEMS} ariaLabel="Carrossel de Classes de Realms of Nocthera" />
          </Revelar>
        </section>

        <SectionDivider />

        <section aria-labelledby="section-combat" className="py-4 sm:py-6">
          <Revelar className="space-y-6">
            <TituloDeSecao id="section-combat" titulo="Sistema de Combate" />
            <p className="text-center max-w-3xl mx-auto text-sm sm:text-base text-[#E2D6B6] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              O combate em Realms of Nocthera é automático: seu personagem luta sozinho, aplicando dano físico ou mágico conforme sua classe e progredindo em poder à medida que sobe de nível. Cada classe desenvolve habilidades próprias ao longo da jornada — de golpes básicos a técnicas devastadoras desbloqueadas nos níveis mais altos. A defesa combina Sobreescudo e resistência física ou mágica, e cada escolha de raça e classe molda um estilo de luta diferente.
            </p>
            <CombatFlowDiagram />
          </Revelar>
        </section>

        <SectionDivider />
        <ModosDeJogo />
        <SectionDivider className="my-10" />
      </div>

      <RodapeDaPagina />
    </main>
  );
}
