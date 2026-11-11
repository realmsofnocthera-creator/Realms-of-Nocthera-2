import { srcDaImagem } from '@/assets/srcDaImagem';
import imgPlacaAlma from './images/alma/placa-alma.webp';
import imgPlacaCorpo from './images/alma/placa-corpo.webp';
import imgPlacaMente from './images/alma/placa-mente.webp';
import imgMolduraAlma from './images/alma/moldura-alma.webp';
import imgMolduraCorpo from './images/alma/moldura-corpo.webp';
import imgMolduraMente from './images/alma/moldura-mente.webp';
import imgPrateleira from './images/alma/prateleira.webp';
import type { CategoriaDeCarta } from '@/rules/almas';

/** As molduras da aba Alma (folha do Yuri): a placa de título e a moldura dos 3 espaços de cada categoria, e a prateleira de 5 cartas. */
export const ALMA_UI = {
  placa: { alma: srcDaImagem(imgPlacaAlma), corpo: srcDaImagem(imgPlacaCorpo), mente: srcDaImagem(imgPlacaMente) },
  moldura: { alma: srcDaImagem(imgMolduraAlma), corpo: srcDaImagem(imgMolduraCorpo), mente: srcDaImagem(imgMolduraMente) },
  prateleira: srcDaImagem(imgPrateleira),
} as const;

/** O tamanho de cada arte (largura / altura), para o espaço da tela ter a proporção certa. */
export const PROPORCAO_DA_ALMA = { placa: { alma: '323 / 96', corpo: '322 / 84', mente: '320 / 83' }, moldura: '281 / 232', prateleira: '903 / 325' } as const;

/** A ordem das colunas na tela: Corpo (vermelho), Alma (roxo, a do meio) e Mente (azul). A cor de cada coluna é a da folha. */
export const COLUNAS_DA_ALMA: readonly CategoriaDeCarta[] = ['corpo', 'alma', 'mente'];

/** Onde ficam os 5 espaços na prateleira (em % da imagem): centro de cada um, largura e topo/altura (medido na arte). */
export const ESPACOS_DA_PRATELEIRA = { centros: [11.2, 30.2, 50.1, 69.9, 88.5] as const, largura: 16.4, topo: 16.3, altura: 74.2 } as const;
