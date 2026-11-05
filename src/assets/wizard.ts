

import bgEscolherNomeImg from './images/wizard/bg-escolher-nome.webp';
import bgDistribuirPontosImg from './images/wizard/bg-distribuir-pontos.webp';
import bgResumoImg from './images/wizard/bg-resumo.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const WIZARD_BACKGROUNDS = {
  escolherNome: srcDaImagem(bgEscolherNomeImg),
  distribuirPontos: srcDaImagem(bgDistribuirPontosImg),
  resumo: srcDaImagem(bgResumoImg),
} as const;
