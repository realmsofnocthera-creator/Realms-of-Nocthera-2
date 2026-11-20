import type { DificuldadeBatalha } from '@/game/batalhaSangrenta';

/**
 * A arte da tela da Batalha Sangrenta (pixel art do Yuri, grade de 360 x 540): o coliseu de fundo, uma moldura por dificuldade e as
 * peças pequenas (gotas das tentativas, nós das lutas, selos, cadeado e os retratos dos chefes). Geradas por
 * `scripts/batalha-sangrenta/converter.py`. As posições foram medidas na tela de exemplo do Yuri.
 */
const PASTA = '/images/batalha-sangrenta';
export const peca = (nome: string): string => `${PASTA}/${nome}.webp`;

export const BATALHA_UI = {
  fundo: peca('fundo'),
  faixa: peca('faixa'),
  voltar: peca('voltar'),
  livro: peca('livro'),
  gota: peca('gota'),
  gotaVazia: peca('gota-vazia'),
  gotaVip: peca('gota-vip'),
  coroaOk: peca('coroa-ok'),
  coroaPend: peca('coroa-pend'),
  noOk: peca('no-ok'),
  noPend: peca('no-pend'),
  noPerdeu: peca('no-perdeu'),
  seloOuro: peca('selo-ouro'),
  seloCinza: peca('selo-cinza'),
  cadeado: peca('cadeado'),
  botao: peca('botao'),
  botaoOff: peca('botao-off'),
  botaoPress: peca('botao-press'),
} as const;

/** A moldura e a posição de cada dificuldade (y do alto da moldura; x é sempre 20) e onde ficam as coisas dentro dela (y relativo). */
export interface QuadroDaDificuldade {
  moldura: string;
  y: number;
  l: number;
  a: number;
  /** o retrato do chefe e onde ele fica (x, y dentro da moldura) */
  retrato: string;
  retratoXY: [number, number];
  /** as linhas de texto (y do centro, dentro da moldura) */
  yTitulo: number;
  yMonstros: number;
  yNome: number;
  yNos: number;
  /** o centro do espaço da direita (o selo, o ▶ ou o cadeado) */
  direita: [number, number];
}

export const QUADROS: Readonly<Record<DificuldadeBatalha, QuadroDaDificuldade>> = {
  facil: { moldura: peca('card1'), y: 118, l: 320, a: 59, retrato: peca('med-darius'), retratoXY: [23, 3], yTitulo: 14, yMonstros: 22, yNome: 31, yNos: 43.5, direita: [274, 28] },
  medio: { moldura: peca('card2'), y: 186, l: 320, a: 65, retrato: peca('med-nymeria'), retratoXY: [25, 6], yTitulo: 17, yMonstros: 26, yNome: 34, yNos: 46, direita: [271, 35] },
  dificil: { moldura: peca('card3'), y: 260, l: 320, a: 70, retrato: peca('med-grizzham'), retratoXY: [23, 9], yTitulo: 20, yMonstros: 29, yNome: 37, yNos: 49, direita: [270, 33] },
  muitoDificil: { moldura: peca('card4'), y: 339, l: 320, a: 67, retrato: peca('med-othrak'), retratoXY: [23, 7], yTitulo: 18, yMonstros: 27, yNome: 35, yNos: 47, direita: [270, 41] },
  inferno: { moldura: peca('card5'), y: 415, l: 320, a: 78, retrato: peca('med-varkhazar'), retratoXY: [23, 14], yTitulo: 24, yMonstros: 33, yNome: 41, yNos: 53, direita: [275, 47] },
};

/** O retrato do segundo chefe do Inferno. */
export const RETRATO_DO_SEGUNDO_CHEFE = peca('med-noctharion');

export const POSICAO = {
  faixa: { x: 96, y: 0, l: 168, a: 88 },
  voltar: { x: 6, y: 6, l: 28, a: 27 },
  livro: { x: 326, y: 6, l: 28, a: 26 },
  /** a primeira gota e o espaço entre as gotas */
  gotaX: 145,
  gotaPasso: 24,
  gotaY: 86,
  gotaLado: 22,
  /** os cinco nós (4 lutas e o chefe) começam em x e andam de 14 em 14 */
  nosX: 150,
  nosPasso: 14,
  nosLado: 13,
} as const;

/** O fim de cada dificuldade na tela: a última moldura acaba em y = 493. */
export const FIM_DAS_MOLDURAS = QUADROS.inferno.y + QUADROS.inferno.a;
