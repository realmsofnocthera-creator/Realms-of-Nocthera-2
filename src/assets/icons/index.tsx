import React from 'react';
import { AttributeName } from '@/rules/attributes';
import { DraconianLineage } from '@/rules/races';

// Importações locais de src/assets/icons/ (evita quebrar caso links externos do ImgBB caiam)
import raceHumanoImg from './race-humano.png';
import raceAnaoImg from './race-anao.png';
import raceElfoImg from './race-elfo.png';
import raceOrcImg from './race-orc.png';
import raceVampiroImg from './race-vampiro.png';
import raceDraconianoImg from './race-draconiano.png';

import classBarbaroImg from './class-barbaro.webp';
import classCavaleiroImg from './class-cavaleiro.webp';
import classFeiticeiroImg from './class-feiticeiro.webp';
import classBandidoImg from './class-bandido.webp';
import classProfetaImg from './class-profeta.webp';
import classSamuraiImg from './class-samurai.webp';

import attrVigorImg from './attr-vigor.png';
import attrSorteImg from './attr-sorte.png';
import attrForcaImg from './attr-forca.png';
import attrVitalidadeImg from './attr-vitalidade.png';
import attrArcanoImg from './attr-arcano.png';
import attrInteligenciaImg from './attr-inteligencia.png';
import attrAgilidadeImg from './attr-agilidade.png';

import resourceHpImg from './resource-hp.png';
import resourceSobreescudoImg from './resource-sobreescudo.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

/** Caminho final do arquivo importado (o bundler gera a URL com hash). */

/**
 * Ícones reais das 6 Raças (salvos em src/assets/icons/)
 * Referências originais:
 * - Humano: https://i.supaimg.com/833eafd4-e7d2-4d38-abe3-4e18a55991dd/be7a60ea-e6f7-4ec8-923a-a088055fc30e.png
 * - Anão: https://i.ibb.co/DDgv9fK6/Race-Dwarf.png
 * - Elfo: https://i.ibb.co/8LwdpH8n/Race-Drow.png
 * - Orc: https://i.ibb.co/LDkRwt46/Race-Half-Orc.png
 * - Vampiro: https://i.ibb.co/4g1NJS2X/Race-Half-Elf.png
 * - Draconiano: https://i.ibb.co/h1J86v0L/Race-Dragonborn.png
 */
export const RACE_ICONS: Readonly<Record<string, string>> = {
  humano: srcDaImagem(raceHumanoImg),
  anao: srcDaImagem(raceAnaoImg),
  elfo: srcDaImagem(raceElfoImg),
  orc: srcDaImagem(raceOrcImg),
  vampiro: srcDaImagem(raceVampiroImg),
  draconiano: srcDaImagem(raceDraconianoImg),
};

/**
 * Ícones reais das 6 Classes (salvos em src/assets/icons/)
 * Referências originais:
 * - Bárbaro: https://i.ibb.co/LX3R9sr7/240px-Class-Barbarian-Badge-Icon-png.webp
 * - Cavaleiro: https://i.ibb.co/wZjvrXGR/240px-Class-Fighter-Badge-Icon-png.webp
 * - Feiticeiro: https://i.ibb.co/99H5qHpF/240px-Class-Sorcerer-Badge-Icon-png.webp
 * - Bandido: https://i.ibb.co/W9z6TYf/240px-Class-Warlock-Badge-Icon-png.webp
 * - Profeta: https://i.ibb.co/6761yXk7/240px-Class-Druid-Badge-Icon-png.webp
 * - Samurai: https://i.ibb.co/sd2HLdWz/240px-Class-Ranger-Badge-Icon-png.webp
 */
export const CLASS_ICONS: Readonly<Record<string, string>> = {
  barbaro: srcDaImagem(classBarbaroImg),
  cavaleiro: srcDaImagem(classCavaleiroImg),
  feiticeiro: srcDaImagem(classFeiticeiroImg),
  bandido: srcDaImagem(classBandidoImg),
  profeta: srcDaImagem(classProfetaImg),
  samurai: srcDaImagem(classSamuraiImg),
};

/**
 * Ícones reais dos 7 Atributos (salvos em src/assets/icons/)
 * Referências originais:
 * - Vigor: https://i.ibb.co/Ld7kLqMr/Constitution-Score-Icon.png
 * - Sorte: provisório, usa a arte antiga da Mente (https://i.ibb.co/6024J43h/Wisdom-Score-Icon.png)
 * - Força: https://i.ibb.co/Q7nCJwGx/Strength-Score-Icon.png
 * - Vitalidade: https://i.ibb.co/20kG0Hx3/Expertise.png
 * - Arcano: https://i.ibb.co/2YYPv37y/Charisma-Score-Icon.png
 * - Inteligência: https://i.ibb.co/tMmLpV6Q/Intelligence-Score-Icon.png
 * - Agilidade: https://i.ibb.co/gZgsszqV/Dexterity-Score-Icon.png
 */
export const ATTRIBUTE_ICONS: Readonly<Record<AttributeName, string>> = {
  vigor: srcDaImagem(attrVigorImg),
  sorte: srcDaImagem(attrSorteImg),
  forca: srcDaImagem(attrForcaImg),
  vitalidade: srcDaImagem(attrVitalidadeImg),
  arcano: srcDaImagem(attrArcanoImg),
  inteligencia: srcDaImagem(attrInteligenciaImg),
  agilidade: srcDaImagem(attrAgilidadeImg),
};

/**
 * Ícones reais de Recursos (salvos em src/assets/icons/)
 * Referências originais:
 * - HP: https://i.ibb.co/ZRBC99PC/HP-Icon.png
 * - Sobreescudo: https://i.ibb.co/d0f8QZ3p/Heavily-Armoured.webp
 */
export const RESOURCE_ICONS = {
  hp: srcDaImagem(resourceHpImg),
  sobreescudo: srcDaImagem(resourceSobreescudoImg),
} as const;

/**
 * PROVISÓRIO: Ícones SVG simples em traço dourado para as 5 linhagens do Draconiano
 * (Fogo, Gelo, Relâmpago, Terra, Vento) — aguardando arte oficial das linhagens.
 */
export function ProvisionalLineageSvg({
  lineage,
  className = 'w-5 h-5',
}: {
  lineage: DraconianLineage;
  className?: string;
}) {
  // PROVISÓRIO: SVGs em traço dourado (#ED8A0C / #B2A66C) para as 5 linhagens do Draconiano
  switch (lineage) {
    case 'fogo':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ED8A0C"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 2c1.5 3.5 4 5.5 4 9a4 4 0 1 1-8 0c0-1.5.5-3 1.5-4.5C9.5 8 11 9 12 9c-1-2.5-.5-5 0-7z" />
          <path
            d="M8.5 14.5A6.5 6.5 0 0 0 12 22a6.5 6.5 0 0 0 6.5-6.5c0-3.5-2.5-6-4-8.5"
            stroke="#B2A66C"
          />
        </svg>
      );
    case 'gelo':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ED8A0C"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 2v20M2 12h20" />
          <path d="m4.93 4.93 14.14 14.14M19.07 4.93 4.93 19.07" stroke="#B2A66C" />
          <polygon points="12 7 14.5 12 12 17 9.5 12" />
        </svg>
      );
    case 'relampago':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ED8A0C"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" />
        </svg>
      );
    case 'terra':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ED8A0C"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <polygon points="12 3 21 19 3 19 12 3" />
          <polyline points="8.5 19 12 12 15.5 19" stroke="#B2A66C" />
        </svg>
      );
    case 'vento':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ED8A0C"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M3 8h12a3 3 0 1 0-3-3" />
          <path d="M2 12h16a3 3 0 1 1-3 3" stroke="#B2A66C" />
          <path d="M4 16h9a2.5 2.5 0 1 1-2.5 2.5" />
        </svg>
      );
  }
}
