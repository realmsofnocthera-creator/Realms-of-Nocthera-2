import type { CategoriaDoTeste } from '@/rules/testeEquipe';

/**
 * A arte da tela do Teste de Equipe (pixel art do Yuri, grade de 360 x 540): as peças em `/images/teste-equipe/tela` e o fundo da câmara.
 * Geradas por `scripts/teste-equipe/tela.py`. As posições foram medidas nas telas de exemplo do Yuri.
 */
const PASTA = '/images/teste-equipe/tela';
export const peca = (nome: string): string => `${PASTA}/${nome}.webp`;

export const TESTE_UI = {
  fundo: peca('fundo'),
  /** o mesmo fundo, desfocado e escuro, nas vistas da party, das dificuldades e das recompensas */
  fundoDesfocado: peca('fundo-desfocado'),
  voltar: peca('voltar'),
  livro: peca('livro'),
  titulo: peca('titulo'),
  botao: peca('botao'),
  botao2: peca('botao2'),
  botaoOff: peca('botao-off'),
  botaoPress: peca('botao-press'),
  placaNome: peca('placa-nome'),
  chaveGratis: peca('chave-gratis'),
  chaveComprada: peca('chave-comprada'),
  chaveAbismo: peca('chave-abismo'),
  altarVazio: peca('altar-vazio'),
  altarOcupado: peca('altar-ocupado'),
  altarPronto: peca('altar-pronto'),
  altarTrancado: peca('altar-trancado'),
  liderOn: peca('lider-on'),
  liderOff: peca('lider-off'),
  prontoOn: peca('pronto-on'),
  prontoOff: peca('pronto-off'),
  feixeOn: peca('feixe-on'),
  feixeOff: peca('feixe-off'),
  info: peca('info'),
  mais: peca('mais'),
  halo: peca('halo'),
  concluido: peca('concluido'),
  trancado: peca('trancado'),
  caminhoOn: peca('caminho-on'),
  caminhoOff: peca('caminho-off'),
  painel: peca('painel'),
  placaRecompensa: peca('placa-recompensa'),
  caco: peca('caco'),
  poeira: peca('poeira'),
  diamante: peca('diamante'),
  carimbo: peca('carimbo'),
} as const;

/** O pilar de cada teste (aceso quando escolhido) e o dorso das cartas dele. */
export const PILAR = (categoria: CategoriaDoTeste, aceso: boolean): string => peca(`pil-${categoria}-${aceso ? 'on' : 'off'}`);
export const DORSO = (categoria: CategoriaDoTeste): string => peca(`dorso-${categoria}`);
/** O medalhão de cada dificuldade (1 a 6) e a moldura de carta de cada raridade (comum a mítica). */
export const SELO_DA_DIFICULDADE = (d: number): string => peca(`selo${Math.min(6, Math.max(1, d))}`);
export const MOLDURA_DA_CARTA = (n: number): string => peca(`moldura${Math.min(6, Math.max(1, n))}`);

export interface Retangulo {
  x: number;
  y: number;
  l: number;
  a: number;
}

export const POSICAO = {
  voltar: { x: 6, y: 8, l: 30, a: 28 },
  livro: { x: 324, y: 8, l: 30, a: 28 },
  titulo: { x: 65, y: 2, l: 230, a: 84 },
  // escolher o teste: os três pilares (o aceso sobe um pouco), as placas com o nome, as chaves e o botão
  pilares: { alma: { x: 14, y: 128, l: 100, a: 177 }, corpo: { x: 130, y: 120, l: 100, a: 175 }, mente: { x: 246, y: 128, l: 100, a: 186 } } as Readonly<Record<CategoriaDoTeste, Retangulo>>,
  placaNome: { y: 312, l: 104, a: 25, xs: [12, 128, 244] },
  chaves: { y: 360, xs: [16, 134, 252], textoDX: 26 },
  botaoFormar: { x: 95, y: 424, l: 170, a: 36 },
  // a party: os três altares, os feixes entre eles, o nome do convidado, a dificuldade, a chave e o botão
  altares: { xs: [14, 130, 246], y: 100, l: 100, a: 143, circulo: { cx: 50, cy: 57 }, nomeY: 131, liderX: 6, liderY: 4, prontoX: 72, prontoY: 4 },
  feixes: [{ x: 58, y: 247, l: 120, a: 15 }, { x: 182, y: 247, l: 120, a: 15 }],
  info: { x: 105, y: 287, l: 150, a: 37 },
  mais: { x: 286, y: 294, l: 24, a: 23 },
  dificuldadeNaParty: { x: 105, y: 330, l: 150, a: 37 },
  chaveDaParty: { x: 100, y: 377 },
  botaoIniciar: { x: 95, y: 452, l: 170, a: 36 },
  // as dificuldades
  painel: { x: 30, y: 66, l: 300, a: 430 },
  linhasDasDificuldades: { x: 66, topoDoInferno: 134, passo: 47, l: 52, a: 50, textoX: 130 },
  botaoEscolher: { x: 95, y: 482, l: 170, a: 36 },
  // as recompensas
  cartas: { xs: [30, 145, 260], y: 92 },
  placasDePremio: { x: 105, ys: [240, 300, 360], l: 150, a: 56 },
  carimbo: { x: 262, y: 360, l: 40, a: 44 },
  botaoContinuar: { x: 95, y: 452, l: 170, a: 36 },
} as const;

/** A linha da dificuldade `d` (1 a 6) na lista: a 6 (Inferno) fica no alto. */
export const topoDaDificuldade = (d: number): number => POSICAO.linhasDasDificuldades.topoDoInferno + POSICAO.linhasDasDificuldades.passo * (6 - d);
