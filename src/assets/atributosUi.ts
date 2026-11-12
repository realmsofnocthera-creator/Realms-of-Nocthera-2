import { srcDaImagem } from '@/assets/srcDaImagem';
import imgMais from './images/atributos/mais.webp';
import imgMenos from './images/atributos/menos.webp';
import imgMaisApagado from './images/atributos/mais-apagado.webp';
import imgMenosApagado from './images/atributos/menos-apagado.webp';

/** Os botões + e − da distribuição de atributos (pixel art feita para a tela, no azul e dourado do kit): acesos e apagados. */
export const BOTOES_DE_ATRIBUTO = {
  mais: srcDaImagem(imgMais),
  menos: srcDaImagem(imgMenos),
  maisApagado: srcDaImagem(imgMaisApagado),
  menosApagado: srcDaImagem(imgMenosApagado),
} as const;
