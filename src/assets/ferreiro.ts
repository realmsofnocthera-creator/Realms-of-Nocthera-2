import { srcDaImagem } from '@/assets/srcDaImagem';
import fundoImg from './images/ferreiro/fundo.webp';
import spritesImg from './images/ferreiro/ferreiro-sprites.webp';

/** O fundo da ferraria (1024×1535) e a folha do ferreiro martelando: 5 colunas × 4 linhas, 184×240 cada, 20 quadros. */
export const FUNDO_DA_FERRARIA = srcDaImagem(fundoImg);
export const SPRITES_DO_FERREIRO = srcDaImagem(spritesImg);
export const QUADROS_DO_FERREIRO = { colunas: 5, linhas: 4, total: 20 } as const;
