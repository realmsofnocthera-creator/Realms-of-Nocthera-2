import { srcDaImagem } from '@/assets/srcDaImagem';
import imgCirculo from './images/emblemas/circulo.webp';
import imgPainelLargo from './images/emblemas/painel-largo.webp';
import imgBarraA from './images/emblemas/barra-a.webp';
import imgBarraB from './images/emblemas/barra-b.webp';

/** As molduras da aba Emblemas (folha azul e dourada do Yuri). Os 4 octógonos do círculo são os espaços de emblema. */
export const EMBLEMAS_UI = {
  circulo: srcDaImagem(imgCirculo),
  painelLargo: srcDaImagem(imgPainelLargo),
  barraA: srcDaImagem(imgBarraA),
  barraB: srcDaImagem(imgBarraB),
} as const;

/** Onde ficam os 4 espaços sobre o círculo (centro e lado do octógono, em % da imagem), medidos na arte. */
export const ESPACOS_DO_CIRCULO = {
  lado: 24.7,
  centros: [[27.8, 28.8], [72.1, 28.8], [27.8, 71.5], [72.1, 71.5]] as const,
} as const;
