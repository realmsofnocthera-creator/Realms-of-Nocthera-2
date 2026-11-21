/**
 * A arte das telas da Arena (pixel art do Yuri, grade de 360 x 540): as peças em `/images/arena/tela` (geradas por `scripts/arena/tela.py`) e
 * as posições, medidas nas telas de exemplo do Yuri. Valem para a seleção de modo, a Arena, a Arena ranqueada e o Campeonato.
 */
const PASTA = '/images/arena/tela';
export const peca = (nome: string): string => `${PASTA}/${nome}.webp`;

export const ARENA_UI = {
  fundoColiseu: peca('fundo-coliseu'),
  fundoTorre: peca('fundo-torre'),
  fundoTorneio: peca('fundo-torneio'),
  fundoCampeao: peca('fundo-campeao'),
  titulo: peca('titulo'),
  voltar: peca('voltar'),
  livro: peca('livro'),
  botao: peca('botao'),
  botaoOff: peca('botao-off'),
  botaoPress: peca('botao-press'),
  modoArena: peca('modo-arena'),
  modoRanqueada: peca('modo-ranqueada'),
  modoCampeonato: peca('modo-campeonato'),
  tab: (n: 1 | 2 | 3, aceso: boolean) => peca(`tab${n}-${aceso ? 'on' : 'off'}`),
  painelJogador: peca('painel-jogador'),
  fichaCheia: peca('ficha-cheia'),
  fichaOuro: peca('ficha-ouro'),
  fichaVazia: peca('ficha-vazia'),
  ampulheta: peca('ic-ampulheta'),
  sobe: peca('ic-sobe'),
  desce: peca('ic-desce'),
  espadas: peca('ic-espadas'),
  replay: peca('ic-replay'),
  trofeu: peca('ic-trofeu'),
  moeda: peca('ic-moeda'),
  diamante: peca('ic-diamante'),
  selo: peca('ic-selo'),
  louros: peca('ic-louros'),
  card: { forte: peca('card-forte'), neutro: peca('card-neutro'), fraco: peca('card-fraco') },
  rcard: { forte: peca('rcard-forte'), neutro: peca('rcard-neutro'), fraco: peca('rcard-fraco') },
  trocar: peca('trocar'),
  rbotaoTrocar: peca('rbotao-trocar'),
  linhaVitoria: peca('linha-vitoria'),
  linhaDerrota: peca('linha-derrota'),
  podio: peca('podio'),
  premioOuro: peca('premio-ouro'),
  premioPrata: peca('premio-prata'),
  badgeQueda: peca('badge-queda'),
  plataforma: { off: peca('plat-off'), ouro: peca('plat-ouro'), vio: peca('plat-vio') },
  recompensas: peca('recompensas'),
  bauFechado: peca('bau-fechado'),
  bauAberto: peca('bau-aberto'),
  contagem: peca('t-contagem'),
  voce: peca('t-voce'),
  voceTrancado: peca('t-voce-trancado'),
  cabecalho: (aceso: boolean) => peca(`t-cab-${aceso ? 'on' : 'off'}`),
  partida: { eu: peca('t-match-eu'), fim: peca('t-match-fim'), normal: peca('t-match-n'), vivo: peca('t-match-v') },
  distintivo: { espera: peca('t-b-espera'), fim: peca('t-b-fim'), vivo: peca('t-b-vivo') },
  faixaCampeao: peca('c-faixa'),
  trofeuCampeao: peca('c-trofeu'),
  bauCampeao: peca('c-bau'),
  bauCampeaoAberto: peca('c-bau-aberto'),
  premioDoLugar: { ouro: peca('c-premio-ouro'), prata: peca('c-premio-prata'), bronze: peca('c-premio-bronze'), azul: peca('c-premio-azul'), cinza: peca('c-premio-cinza') },
  coroa: peca('c-coroa'),
  louroSolto: peca('c-louros'),
  tituloDoCampeao: (n: 1 | 2 | 3 | 5) => peca(`c-tit${n}`),
} as const;

/** A insígnia de cada ranque (1 a 10): `p` (pequena, 34 px) e `g` (grande, 64 px). */
export const INSIGNIA_DO_RANQUE = (indice: number, tamanho: 'p' | 'g'): string => peca(`rank${String(Math.min(10, Math.max(1, indice + 1))).padStart(2, '0')}-${tamanho}`);

export interface Ret { x: number; y: number; l: number; a: number }

export const POSICAO = {
  voltar: { x: 6, y: 8, l: 30, a: 29 },
  livro: { x: 324, y: 8, l: 30, a: 29 },
  titulo: { x: 80, y: 0, l: 200, a: 70 },
  // seleção de modo: os 3 cartões
  modos: { arena: { x: 10, y: 92, l: 340, a: 104 }, ranqueada: { x: 10, y: 218, l: 340, a: 111 }, campeonato: { x: 10, y: 351, l: 340, a: 111 } },
  // as 3 abas (Arena, Ranqueada, Campeonato)
  abas: { xs: [6, 124, 241], y: 74, l: 112, a: 33 },
  painelJogador: { x: 11, y: 110, l: 338, a: 64 },
  /** o buraco redondo do painel (centro e diâmetro) e a área do texto */
  painelCirculo: { cx: 45, cy: 32, d: 40 },
  fichas: { xs: [10, 37, 64, 91, 118], y: 180, tamanho: 24, passo: 27 },
  ampulheta: { x: 216, y: 184 },
  // lista de adversários da Arena (5 cartões de 340 x 50) e da Ranqueada (5 de 340 x 40)
  cartao: { x: 10, l: 340, a: 50, ys: [210, 263, 316, 370, 424], iconeX: 288, espadasX: 322, iconeDY: 21 },
  rcartao: { x: 10, l: 340, a: 40, ys: [301, 343, 385, 427, 471], iconeX: 292, espadasX: 320, iconeDY: 15 },
  trocar: { x: 10, y: 481, l: 130, a: 32 },
  // a fatia do cartão que estica: o miolo escuro (x do cartão de origem)
  fatiaDoCartao: { esquerda: 85, direita: 22, miolo: [86, 96] as [number, number], origemL: 120 },
  // ranqueada
  ranquePainel: { x: 11, y: 204, l: 338, a: 64 },
  ranqueFichas: { y: 272 },
  badgeQueda: { x: 166, y: 272 },
  // chave do campeonato
  contagem: { x: 95, y: 54, l: 170, a: 38 },
  voce: { x: 70, y: 95, l: 220, a: 56 },
  textoDeBaixo: [465, 483],
} as const;

/** As posições (centro x, pés y) dos 10 degraus do mapa dos ranques, de baixo para cima, na grade 360 x 540 da tela da Ranqueada. */
export const DEGRAUS_DOS_RANQUES: readonly { x: number; y: number }[] = [
  { x: 57, y: 177 }, { x: 93, y: 160 }, { x: 179, y: 146 }, { x: 267, y: 127 }, { x: 301, y: 134 },
  { x: 232, y: 112 }, { x: 180, y: 105 }, { x: 97, y: 97 }, { x: 57, y: 73 }, { x: 89, y: 57 },
];
