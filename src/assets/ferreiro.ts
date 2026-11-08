import { srcDaImagem } from '@/assets/srcDaImagem';
import fundoImg from './images/ferreiro/fundo.webp';
import spritesImg from './images/ferreiro/ferreiro-sprites.webp';

/** O fundo da ferraria (1024×1535) e a folha do ferreiro martelando: 7 quadros em linha, 96×96 cada (pixel art pequena, ampliada sem suavizar). */
export const FUNDO_DA_FERRARIA = srcDaImagem(fundoImg);
export const SPRITES_DO_FERREIRO = srcDaImagem(spritesImg);
export const QUADROS_DO_FERREIRO = { colunas: 7, linhas: 1, total: 7 } as const;
