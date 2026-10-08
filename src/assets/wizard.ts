import racaHumanoImg from './images/wizard/racas/raca-humano.png';
import racaAnaoImg from './images/wizard/racas/raca-anao.png';
import racaElfoImg from './images/wizard/racas/raca-elfo.png';
import racaOrcImg from './images/wizard/racas/raca-orc.png';
import racaVampiroImg from './images/wizard/racas/raca-vampiro.png';
import racaDraconianoImg from './images/wizard/racas/raca-draconiano.png';

import classeBarbaroImg from './images/wizard/classes/classe-barbaro.png';
import classeCavaleiroImg from './images/wizard/classes/classe-cavaleiro.png';
import classeFeiticeiroImg from './images/wizard/classes/classe-feiticeiro.png';
import classeBandidoImg from './images/wizard/classes/classe-bandido.png';
import classeProfetaImg from './images/wizard/classes/classe-profeta.png';
import classeSamuraiImg from './images/wizard/classes/classe-samurai.png';

import bgEscolherNomeImg from './images/wizard/bg-escolher-nome.png';
import bgDistribuirPontosImg from './images/wizard/bg-distribuir-pontos.png';
import bgResumoImg from './images/wizard/bg-resumo.png';

type ImportedImage = string | { src: string };

function resolveImgSrc(imported: ImportedImage, fallback: string): string {
  if (!imported) return fallback;
  if (typeof imported === 'string') return imported;
  if (typeof imported === 'object' && typeof imported.src === 'string') {
    return imported.src;
  }
  return fallback;
}

/**
 * Mapeamento dos IDs canônicos de raças (src/rules/races.ts) para as artes do wizard.
 */
export const WIZARD_RACE_IMAGES: Readonly<Record<string, string>> = {
  humano: resolveImgSrc(racaHumanoImg, '/images/wizard/racas/raca-humano.png'),
  anao: resolveImgSrc(racaAnaoImg, '/images/wizard/racas/raca-anao.png'),
  elfo: resolveImgSrc(racaElfoImg, '/images/wizard/racas/raca-elfo.png'),
  orc: resolveImgSrc(racaOrcImg, '/images/wizard/racas/raca-orc.png'),
  vampiro: resolveImgSrc(racaVampiroImg, '/images/wizard/racas/raca-vampiro.png'),
  draconiano: resolveImgSrc(
    racaDraconianoImg,
    '/images/wizard/racas/raca-draconiano.png'
  ),
};

/**
 * Mapeamento dos IDs canônicos de classes (src/rules/classes.ts) para as artes do wizard.
 */
export const WIZARD_CLASS_IMAGES: Readonly<Record<string, string>> = {
  barbaro: resolveImgSrc(classeBarbaroImg, '/images/wizard/classes/classe-barbaro.png'),
  cavaleiro: resolveImgSrc(
    classeCavaleiroImg,
    '/images/wizard/classes/classe-cavaleiro.png'
  ),
  feiticeiro: resolveImgSrc(
    classeFeiticeiroImg,
    '/images/wizard/classes/classe-feiticeiro.png'
  ),
  bandido: resolveImgSrc(classeBandidoImg, '/images/wizard/classes/classe-bandido.png'),
  profeta: resolveImgSrc(classeProfetaImg, '/images/wizard/classes/classe-profeta.png'),
  samurai: resolveImgSrc(classeSamuraiImg, '/images/wizard/classes/classe-samurai.png'),
};

export const WIZARD_BACKGROUNDS = {
  escolherNome: resolveImgSrc(
    bgEscolherNomeImg,
    '/images/wizard/bg-escolher-nome.png'
  ),
  distribuirPontos: resolveImgSrc(
    bgDistribuirPontosImg,
    '/images/wizard/bg-distribuir-pontos.png'
  ),
  resumo: resolveImgSrc(bgResumoImg, '/images/wizard/bg-resumo.png'),
} as const;
