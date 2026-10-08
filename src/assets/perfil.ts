import molduraEsquerdaImg from './images/perfil/perfil-moldura-esquerda.webp';
import fundoDireitaImg from './images/perfil/perfil-fundo-direita.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const PERFIL_IMAGES = {
  molduraEsquerda: srcDaImagem(molduraEsquerdaImg),
  fundoDireita: srcDaImagem(fundoDireitaImg),
} as const;
