import { srcDaImagem } from '@/assets/srcDaImagem';
import imgPraca from './images/guilda/praca.webp';

/**
 * A praça da guilda (arte do Yuri): a imagem parada (a capa e o fundo de reserva) e os dois vídeos de 12 s em repetição,
 * 1024 x 1536, sem áudio. O navegador usa o AV1 (451 KB) quando sabe tocar e, senão, o H.264 (626 KB). Os arquivos têm
 * versão no nome (praca-v1) porque ficam em cache por um ano: ao trocar o vídeo, troque a versão.
 */
export const PRACA_DA_GUILDA = {
  imagem: srcDaImagem(imgPraca),
  videoAv1: '/videos/guilda/praca-v1.av1.mp4',
  videoH264: '/videos/guilda/praca-v1.h264.mp4',
  /** O tipo do AV1 em MP4 (perfil principal, nível 4.0, 8 bits, lido do próprio arquivo): sem isso o navegador tentaria baixar e falharia. */
  tipoAv1: 'video/mp4; codecs="av01.0.08M.08"',
  tipoH264: 'video/mp4',
  largura: 1024,
  altura: 1536,
} as const;

/** As molduras da praça (em pixels do quadro de 1024 x 1536): [esquerda, topo, direita, base]. */
export const MOLDURAS_DA_PRACA = {
  placa1: [76, 528, 322, 668],
  placa2: [76, 676, 322, 812],
  placa3: [76, 818, 322, 948],
  placa4: [76, 962, 322, 1092],
  quadro: [385, 772, 696, 1022],
  losango: [770, 455, 968, 652],
  redonda: [782, 678, 966, 862],
} as const;

export type MolduraDaPraca = keyof typeof MOLDURAS_DA_PRACA;
