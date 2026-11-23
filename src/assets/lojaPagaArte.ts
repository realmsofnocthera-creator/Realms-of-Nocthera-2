/**
 * As artes da Loja Premium (pixel art do Yuri, fundo verde já tirado), em `public/images/loja`: as molduras dos pacotes mensais (I a IV), os banners
 * verticais dos Passes, e as ilustrações dos pacotes. `furo` é onde o texto cabe dentro da moldura, em % da imagem (medido na própria arte).
 */
const PASTA = '/images/loja';
export const arteDaLoja = (nome: string): string => `${PASTA}/${nome}.webp`;

export interface MolduraDaLoja {
  src: string;
  /** largura / altura da imagem */
  proporcao: number;
  furo: { x: number; y: number; l: number; a: number };
}

const m = (nome: string, l: number, a: number, furo: MolduraDaLoja['furo']): MolduraDaLoja => ({ src: arteDaLoja(nome), proporcao: l / a, furo });

/** A moldura de cada pacote mensal, do I ao IV. */
export const MOLDURA_DO_MENSAL: Readonly<Record<1 | 2 | 3 | 4, MolduraDaLoja>> = {
  1: m('mensal-1', 560, 570, { x: 19, y: 18, l: 62, a: 62 }),
  2: m('mensal-2', 560, 582, { x: 19, y: 18, l: 62, a: 61 }),
  3: m('mensal-3', 560, 556, { x: 15, y: 14, l: 70, a: 70 }),
  4: m('mensal-4', 560, 557, { x: 18, y: 24, l: 64, a: 52 }),
};

/** O banner de cada Passe. */
export const BANNER_DO_PASSE: Readonly<Record<'premium' | 'deluxe' | 'invocador' | 'diamantes', MolduraDaLoja>> = {
  premium: m('passe-premium', 420, 774, { x: 25, y: 15, l: 50, a: 70 }),
  deluxe: m('passe-deluxe', 420, 775, { x: 26, y: 19, l: 48, a: 61 }),
  invocador: m('passe-invocador', 420, 806, { x: 25, y: 20, l: 50, a: 64 }),
  diamantes: m('passe-diamantes', 420, 779, { x: 24, y: 21, l: 50, a: 61 }),
};

/** As ilustrações dos pacotes (sem moldura). */
export const ILUSTRACAO_DA_LOJA = {
  mochila: arteDaLoja('mochila'),
  vagaDeExpedicao: arteDaLoja('vaga-expedicao'),
  iniciante: arteDaLoja('iniciante'),
  /** O monte de diamantes dos pacotes 2 a 6 (o 1º usa um diamante só). */
  diamantes: { 2: arteDaLoja('diamantes-2'), 3: arteDaLoja('diamantes-3'), 4: arteDaLoja('diamantes-4'), 5: arteDaLoja('diamantes-5'), 6: arteDaLoja('diamantes-6') } as Readonly<Record<2 | 3 | 4 | 5 | 6, string>>,
} as const;
