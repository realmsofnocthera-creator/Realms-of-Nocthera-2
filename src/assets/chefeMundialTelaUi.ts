/**
 * A arte da tela do Chefe Mundial (pixel art do Yuri, grade de 360 x 540): as peças em `/images/chefe-mundial/tela` e, em cada
 * dia, o fundo do chefe. Geradas por `scripts/chefe-mundial/tela.py`. As posições (em pixels da grade) foram medidas nas telas de
 * exemplo do Yuri.
 */
const PASTA = '/images/chefe-mundial/tela';
export const peca = (nome: string): string => `${PASTA}/${nome}.webp`;

export const TELA_DO_CHEFE = {
  banner: peca('banner'),
  fita: peca('fita'),
  info: peca('info'),
  bandeja: peca('bandeja'),
  dano: peca('dano'),
  botao: peca('botao'),
  botaoOff: peca('botao-off'),
  botaoPress: peca('botao-press'),
  fechar: peca('fechar'),
  voltar: peca('voltar'),
  ranking: peca('ranking'),
  ampulheta: peca('ampulheta'),
  trofeu: peca('trofeu'),
  linhaEu: peca('linha-eu'),
  painelRank: peca('painel-rank'),
  painelRec: peca('painel-rec'),
} as const;

/** A linha do ranking: 1º ouro, 2º prata, 3º bronze e as demais. */
export const linhaDoRanking = (posicao: number): string => peca(`linha-${Math.min(4, Math.max(1, posicao))}`);

export const fundoDoChefe = (chefeId: string): string => peca(`fundo-${chefeId}`);

/** Onde cada peça fica na grade 360 x 540 (x, y do canto de cima à esquerda; l e a = largura e altura). */
export const POSICAO = {
  chefe: { x: 67, y: 90, l: 226, a: 300 },
  banner: { x: 65, y: 0, l: 230, a: 100 },
  fita: { x: 105, y: 94, l: 150, a: 25 },
  tempo: { x: 4, y: 104, l: 118, a: 29 },
  posicao: { x: 238, y: 104, l: 118, a: 29 },
  ampulheta: { x: 2, y: 104, l: 26, a: 28 },
  trofeu: { x: 328, y: 105, l: 26, a: 28 },
  bandeja: { x: 6, y: 142, l: 148, a: 51 },
  dano: { x: 115, y: 398, l: 130, a: 112 },
  botao: { x: 128, y: 496, l: 104, a: 44 },
  voltar: { x: 6, y: 504, l: 30, a: 29 },
  ranking: { x: 324, y: 504, l: 30, a: 29 },
  // a tela do ranking
  tituloDoRanking: { x: 105, y: 6, l: 150, a: 25 },
  fechar: { x: 332, y: 6, l: 24, a: 23 },
  painelRank: { x: 6, y: 34, l: 262, a: 436 },
  painelRec: { x: 272, y: 34, l: 62, a: 338 },
  linhaEu: { x: 6, y: 476, l: 262, a: 36 },
} as const;

/** Os 4 espaços da bandeja (dentro dela): x, y, largura e altura. */
export const ESPACOS_DA_BANDEJA = [18, 47, 76, 104].map((x) => ({ x: POSICAO.bandeja.x + x, y: POSICAO.bandeja.y + 17, l: 26, a: 25 }));
/** Os 3 espaços do painel de recompensas do ranking. */
export const ESPACOS_DO_PAINEL = [110, 181, 253].map((y) => ({ x: POSICAO.painelRec.x + 14, y: POSICAO.painelRec.y + y, l: 33, a: 34 }));

/** A primeira linha do ranking e quanto cada uma desce; as colunas (centro do número, início do nome, fim do dano). */
export const LINHAS = { primeiraY: 113, passo: 33, x: 36, l: 200, a: 34, numeroX: 70, nomeX: 98, danoFimX: 226 } as const;
export const COLUNAS_DO_CABECALHO = { y: 106, numeroX: 70, jogadorX: 128, danoX: 198 } as const;
