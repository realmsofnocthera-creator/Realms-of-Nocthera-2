import { srcDaImagem } from '@/assets/srcDaImagem';
import type { EspacoArmadura } from '@/rules/armaduras';
import img_elmo_fill from './images/forja/pecas/elmo-fill.webp';
import img_elmo_linha from './images/forja/pecas/elmo-linha.webp';
import img_peitoral_fill from './images/forja/pecas/peitoral-fill.webp';
import img_peitoral_linha from './images/forja/pecas/peitoral-linha.webp';
import img_luvas_fill from './images/forja/pecas/luvas-fill.webp';
import img_luvas_linha from './images/forja/pecas/luvas-linha.webp';
import img_perneiras_fill from './images/forja/pecas/perneiras-fill.webp';
import img_perneiras_linha from './images/forja/pecas/perneiras-linha.webp';
import img_botas_fill from './images/forja/pecas/botas-fill.webp';
import img_botas_linha from './images/forja/pecas/botas-linha.webp';

/**
 * As 5 peças de armadura em duas camadas: o preenchimento (branco, pintado com a cor da raridade) e o contorno
 * (preto, por cima). Uma base só para todos os conjuntos.
 */
export const PECA_PREENCHIMENTO: Readonly<Record<EspacoArmadura, string>> = {
  elmo: srcDaImagem(img_elmo_fill),
  peitoral: srcDaImagem(img_peitoral_fill),
  luvas: srcDaImagem(img_luvas_fill),
  perneiras: srcDaImagem(img_perneiras_fill),
  botas: srcDaImagem(img_botas_fill),
};

export const PECA_CONTORNO: Readonly<Record<EspacoArmadura, string>> = {
  elmo: srcDaImagem(img_elmo_linha),
  peitoral: srcDaImagem(img_peitoral_linha),
  luvas: srcDaImagem(img_luvas_linha),
  perneiras: srcDaImagem(img_perneiras_linha),
  botas: srcDaImagem(img_botas_linha),
};
