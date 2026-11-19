import { srcDaImagem } from '@/assets/srcDaImagem';
import fundoMesa from './images/guerreiro/fundo-mesa.webp';
import fundoCompacto from './images/guerreiro/fundo-compacto.webp';
import fundoPainel from './images/guerreiro/fundo-painel.webp';
import banner from './images/guerreiro/banner.webp';
import botao from './images/guerreiro/botao.webp';
import moldura from './images/guerreiro/moldura.webp';
import carta1_34 from './images/guerreiro/carta-1-34.webp';
import carta2_34 from './images/guerreiro/carta-2-34.webp';
import carta3_34 from './images/guerreiro/carta-3-34.webp';
import carta4_34 from './images/guerreiro/carta-4-34.webp';
import carta5_34 from './images/guerreiro/carta-5-34.webp';
import carta6_34 from './images/guerreiro/carta-6-34.webp';
import carta7_34 from './images/guerreiro/carta-7-34.webp';
import carta8_34 from './images/guerreiro/carta-8-34.webp';
import carta9_34 from './images/guerreiro/carta-9-34.webp';
import carta10_34 from './images/guerreiro/carta-10-34.webp';
import carta1_50 from './images/guerreiro/carta-1-50.webp';
import carta2_50 from './images/guerreiro/carta-2-50.webp';
import carta3_50 from './images/guerreiro/carta-3-50.webp';
import carta4_50 from './images/guerreiro/carta-4-50.webp';
import carta5_50 from './images/guerreiro/carta-5-50.webp';
import carta6_50 from './images/guerreiro/carta-6-50.webp';
import carta7_50 from './images/guerreiro/carta-7-50.webp';
import carta8_50 from './images/guerreiro/carta-8-50.webp';
import carta9_50 from './images/guerreiro/carta-9-50.webp';
import carta10_50 from './images/guerreiro/carta-10-50.webp';
import carta1_96 from './images/guerreiro/carta-1-96.webp';
import carta2_96 from './images/guerreiro/carta-2-96.webp';
import carta3_96 from './images/guerreiro/carta-3-96.webp';
import carta4_96 from './images/guerreiro/carta-4-96.webp';
import carta5_96 from './images/guerreiro/carta-5-96.webp';
import carta6_96 from './images/guerreiro/carta-6-96.webp';
import carta7_96 from './images/guerreiro/carta-7-96.webp';
import carta8_96 from './images/guerreiro/carta-8-96.webp';
import carta9_96 from './images/guerreiro/carta-9-96.webp';
import carta10_96 from './images/guerreiro/carta-10-96.webp';
import verso34 from './images/guerreiro/verso-34.webp';
import verso50 from './images/guerreiro/verso-50.webp';
import verso96 from './images/guerreiro/verso-96.webp';

/**
 * A mesa de tarô da Provação do Guerreiro (arte do Yuri, grade de pixel 360 x 540). As cartas I a X são as dificuldades 1 a 10, em
 * três tamanhos: 50x75 na mesa, 34x51 na mesa compacta (com uma carta escolhida) e 96x144 no painel de detalhe.
 */
export const GUERREIRO_UI = {
  fundoMesa: srcDaImagem(fundoMesa),
  fundoCompacto: srcDaImagem(fundoCompacto),
  fundoPainel: srcDaImagem(fundoPainel),
  banner: srcDaImagem(banner),
  botao: srcDaImagem(botao),
  moldura: srcDaImagem(moldura),
} as const;

const C34 = [carta1_34, carta2_34, carta3_34, carta4_34, carta5_34, carta6_34, carta7_34, carta8_34, carta9_34, carta10_34].map(srcDaImagem);
const C50 = [carta1_50, carta2_50, carta3_50, carta4_50, carta5_50, carta6_50, carta7_50, carta8_50, carta9_50, carta10_50].map(srcDaImagem);
const C96 = [carta1_96, carta2_96, carta3_96, carta4_96, carta5_96, carta6_96, carta7_96, carta8_96, carta9_96, carta10_96].map(srcDaImagem);
const VERSOS = { 34: srcDaImagem(verso34), 50: srcDaImagem(verso50), 96: srcDaImagem(verso96) } as const;

/** A carta de uma dificuldade (1 a 10) no tamanho pedido (34, 50 ou 96 px de largura); `verso` mostra o verso (dificuldade trancada). */
export function cartaDoGuerreiro(dificuldade: number, tamanho: 34 | 50 | 96, verso = false): string {
  if (verso) return VERSOS[tamanho];
  const lista = tamanho === 34 ? C34 : tamanho === 50 ? C50 : C96;
  return lista[Math.min(10, Math.max(1, dificuldade)) - 1];
}

export const INTRO_DO_GUERREIRO = {
  videoAv1: '/videos/guerreiro/intro-v1.av1.mp4',
  videoH264: '/videos/guerreiro/intro-v1.h264.mp4',
} as const;

/**
 * As posições (na grade 360 x 540) de cada carta: a mesa aberta (cartas 50x75, duas fileiras de 5, a de baixo mais larga pela
 * perspectiva) e a mesa compacta (34x51), que sobe quando uma carta é escolhida. `x` é o centro; `y` o topo da carta.
 */
export const POSICAO_DAS_CARTAS = {
  aberta: {
    largura: 50, altura: 75,
    x: [52, 116, 180, 243, 308, 40, 110, 180, 250, 320],
    y: [293, 293, 293, 293, 293, 383, 383, 383, 383, 383],
  },
  compacta: {
    largura: 34, altura: 51,
    x: [80, 130, 180, 230, 280, 72, 126, 180, 234, 288],
    y: [228, 228, 228, 228, 228, 292, 292, 292, 292, 292],
  },
} as const;

/** As 5 molduras vazias do painel de detalhe (28x28, em y=474): o jogo põe o conteúdo dentro. */
export const MOLDURAS_DO_PAINEL = { y: 474, x: [168, 202, 236, 270, 304], lado: 28 } as const;
