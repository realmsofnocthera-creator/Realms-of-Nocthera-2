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

/**
 * Os mapas são um campo contínuo (versão 2 do Yuri): o monstro e o herói ficam nas mesmas posições da Caçada. Os arquivos
 * levam a versão no nome (mapa-1-v2) porque ficam em cache por um ano: ao trocar um vídeo, troque a versão.
 */
export type MapaDaTorre = MapaDaCacada;
const VERSAO = 2;

const mapa = (n: number): MapaDaTorre => {
  const de = (n - 1) * ANDARES_POR_MAPA + 1;
  return {
    nome: TEXTOS_DA_TORRE.nomeDoMapa(de, de + ANDARES_POR_MAPA - 1),
    imagem: `/images/torre/mapas/cenario-${n}-v${VERSAO}.webp`,
    videoAv1: `/videos/torre/mapa-${n}-v${VERSAO}.av1.mp4`,
    videoH264: `/videos/torre/mapa-${n}-v${VERSAO}.h264.mp4`,
  };
};

export const MAPAS_DA_TORRE: Readonly<Record<number, MapaDaTorre>> = Object.fromEntries(
  Array.from({ length: TOTAL_DE_MAPAS_DA_TORRE }, (_, i) => [i + 1, mapa(i + 1)])
);

/** O mapa de um andar (1 a 300): um por capítulo de 10 andares. */
export function mapaDoAndar(andar: number): number {
  return Math.min(TOTAL_DE_MAPAS_DA_TORRE, Math.max(1, Math.ceil(andar / ANDARES_POR_MAPA)));
}
