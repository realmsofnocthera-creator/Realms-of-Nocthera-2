import racaHumanoImg from './images/wizard/racas/raca-humano.webp';
import racaAnaoImg from './images/wizard/racas/raca-anao.webp';
import racaElfoImg from './images/wizard/racas/raca-elfo.webp';
import racaOrcImg from './images/wizard/racas/raca-orc.webp';
import racaVampiroImg from './images/wizard/racas/raca-vampiro.webp';
import racaDraconianoImg from './images/wizard/racas/raca-draconiano.webp';

import classeBarbaroImg from './images/wizard/classes/classe-barbaro.webp';
import classeCavaleiroImg from './images/wizard/classes/classe-cavaleiro.webp';
import classeFeiticeiroImg from './images/wizard/classes/classe-feiticeiro.webp';
import classeBandidoImg from './images/wizard/classes/classe-bandido.webp';
import classeProfetaImg from './images/wizard/classes/classe-profeta.webp';
import classeSamuraiImg from './images/wizard/classes/classe-samurai.webp';

import bgEscolherNomeImg from './images/wizard/bg-escolher-nome.webp';
import bgDistribuirPontosImg from './images/wizard/bg-distribuir-pontos.webp';
import bgResumoImg from './images/wizard/bg-resumo.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

/**
 * Mapeamento dos IDs canônicos de raças (src/rules/races.ts) para as artes do wizard.
 */
export const WIZARD_RACE_IMAGES: Readonly<Record<string, string>> = {
  humano: srcDaImagem(racaHumanoImg),
  anao: srcDaImagem(racaAnaoImg),
  elfo: srcDaImagem(racaElfoImg),
  orc: srcDaImagem(racaOrcImg),
  vampiro: srcDaImagem(racaVampiroImg),
  draconiano: srcDaImagem(racaDraconianoImg),
};

/**
 * Mapeamento dos IDs canônicos de classes (src/rules/classes.ts) para as artes do wizard.
 */
export const WIZARD_CLASS_IMAGES: Readonly<Record<string, string>> = {
  barbaro: srcDaImagem(classeBarbaroImg),
  cavaleiro: srcDaImagem(classeCavaleiroImg),
  feiticeiro: srcDaImagem(classeFeiticeiroImg),
  bandido: srcDaImagem(classeBandidoImg),
  profeta: srcDaImagem(classeProfetaImg),
  samurai: srcDaImagem(classeSamuraiImg),
};

export const WIZARD_BACKGROUNDS = {
  escolherNome: srcDaImagem(bgEscolherNomeImg),
  distribuirPontos: srcDaImagem(bgDistribuirPontosImg),
  resumo: srcDaImagem(bgResumoImg),
} as const;
