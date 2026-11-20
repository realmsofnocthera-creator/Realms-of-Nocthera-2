import type { MapaDaCacada } from '@/assets/mapasDaCacada';
import type { DificuldadeBatalha } from '@/game/batalhaSangrenta';
import { TEXTOS_DA_BATALHA_SANGRENTA } from '@/rules/textosDaBatalhaSangrenta';

/**
 * As 5 arenas da Batalha Sangrenta (arte animada do Yuri), uma para cada dificuldade: campo contínuo, vídeo de 4 s em repetição,
 * 720 x 1080, sem som (AV1 quando o navegador sabe tocar, H.264 no resto), com a capa parada. Os arquivos levam versão no nome
 * (arena-1-v1) porque ficam em cache por um ano. Gerados por `scripts/batalha-sangrenta/arenas.py`.
 */
const ARENAS: readonly [DificuldadeBatalha, string][] = [
  ['facil', 'Fosso de Ossos'],
  ['medio', 'Fortaleza de Ferro'],
  ['dificil', 'Arena de Espinhos'],
  ['muitoDificil', 'Coliseu Sangrento'],
  ['inferno', 'Arena Obsidiana'],
];

export const ARENAS_DA_BATALHA: Readonly<Record<DificuldadeBatalha, MapaDaCacada>> = Object.fromEntries(
  ARENAS.map(([id, nome], i) => [id, {
    nome: TEXTOS_DA_BATALHA_SANGRENTA.nomeDaArena(nome),
    imagem: `/images/batalha-sangrenta/arenas/arena-${i + 1}-v1.webp`,
    videoAv1: `/videos/batalha-sangrenta/arena-${i + 1}-v1.av1.mp4`,
    videoH264: `/videos/batalha-sangrenta/arena-${i + 1}-v1.h264.mp4`,
  }])
) as Record<DificuldadeBatalha, MapaDaCacada>;
