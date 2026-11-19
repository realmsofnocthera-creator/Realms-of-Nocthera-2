import type { MapaDaCacada } from '@/assets/mapasDaCacada';
import { TEXTOS_DA_TORRE } from '@/rules/textosDaTorre';

/**
 * Os 30 mapas da Torre Celestial (arte animada do Yuri), um para cada capítulo de 10 andares (mapa 1 = andares 1 a 10, …,
 * mapa 30 = andares 291 a 300). Cada mapa é um vídeo de 4 s em repetição, 720 x 1080 (a grade de pixel do Yuri em dobro),
 * sem som: AV1 quando o navegador sabe tocar e H.264 no resto. A capa é o primeiro quadro. Os arquivos levam versão no nome
 * (mapa-1-v1) porque ficam em cache por um ano: ao trocar um vídeo, troque a versão. Gerados por `scripts/torre/mapas.py`.
 */
export const ANDARES_POR_MAPA = 10;
export const TOTAL_DE_MAPAS_DA_TORRE = 30;

/** Onde cada um fica no mapa, em fração da largura e da altura: o monstro na plataforma do alto e o herói na de baixo. */
export interface CenaDoMapaDaTorre {
  monstroX: number;
  monstroPes: number;
  jogadorX: number;
  jogadorPes: number;
}

export interface MapaDaTorre extends MapaDaCacada {
  /** Só nos mapas de plataformas (v1); os de campo contínuo (v2) usam as posições da Caçada. */
  cena?: CenaDoMapaDaTorre;
}

/**
 * A versão do arquivo de cada mapa (v1: duas plataformas, mapas 1 a 10; v2: campo contínuo como o da Caçada, mapas 11 a 30).
 * Os arquivos levam a versão no nome porque ficam em cache por um ano.
 */
const PRIMEIRO_MAPA_DE_CAMPO = 11;
const versaoDoMapa = (n: number): number => (n >= PRIMEIRO_MAPA_DE_CAMPO ? 2 : 1);

/**
 * O centro das duas plataformas de cada mapa de plataformas (v1, mapas 1 a 10) (monstro x, y; herói x, y), lido à vista sobre uma grade: é uma ESTIMATIVA,
 * a conferir (e ajustar) na tela. Os pés ficam um pouco abaixo do centro da plataforma.
 */
const PLATAFORMAS: readonly (readonly [number, number, number, number])[] = [
  [0.76, 0.34, 0.47, 0.63], [0.69, 0.28, 0.49, 0.57], [0.82, 0.35, 0.52, 0.66], [0.75, 0.27, 0.49, 0.62], [0.80, 0.24, 0.50, 0.58],
  [0.86, 0.23, 0.53, 0.59], [0.75, 0.20, 0.46, 0.50], [0.75, 0.27, 0.52, 0.59], [0.84, 0.25, 0.73, 0.67], [0.65, 0.23, 0.50, 0.60],
];

const mapa = (n: number): MapaDaTorre => {
  const de = (n - 1) * ANDARES_POR_MAPA + 1;
  const v = versaoDoMapa(n);
  const base = {
    nome: TEXTOS_DA_TORRE.nomeDoMapa(de, de + ANDARES_POR_MAPA - 1),
    imagem: `/images/torre/mapas/cenario-${n}-v${v}.webp`,
    videoAv1: `/videos/torre/mapa-${n}-v${v}.av1.mp4`,
    videoH264: `/videos/torre/mapa-${n}-v${v}.h264.mp4`,
  };
  if (n >= PRIMEIRO_MAPA_DE_CAMPO) return base;
  const [monstroX, monstroPes, jogadorX, jogadorPes] = PLATAFORMAS[n - 1];
  return { ...base, cena: { monstroX, monstroPes: monstroPes + 0.02, jogadorX, jogadorPes: jogadorPes + 0.03 } };
};

export const MAPAS_DA_TORRE: Readonly<Record<number, MapaDaTorre>> = Object.fromEntries(
  Array.from({ length: TOTAL_DE_MAPAS_DA_TORRE }, (_, i) => [i + 1, mapa(i + 1)])
);

/** O mapa de um andar (1 a 300): um por capítulo de 10 andares. */
export function mapaDoAndar(andar: number): number {
  return Math.min(TOTAL_DE_MAPAS_DA_TORRE, Math.max(1, Math.ceil(andar / ANDARES_POR_MAPA)));
}
