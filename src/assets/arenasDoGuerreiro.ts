import type { MapaDaCacada } from '@/assets/mapasDaCacada';
import { TEXTOS_DO_GUERREIRO } from '@/rules/textosDoGuerreiro';

/**
 * As 10 arenas da Provação do Guerreiro (arte animada do Yuri), uma para cada dificuldade/chefe: campo contínuo, vídeo de 4 s em
 * repetição, 720 x 1080, sem som (AV1 quando o navegador sabe tocar, H.264 no resto), com a capa parada. Os arquivos levam versão
 * no nome (arena-1-v1) porque ficam em cache por um ano. Gerados por `scripts/guerreiro/arenas.py`.
 */
const NOMES = ['Feira de Astaroth', 'Laboratório de Zephyron', 'Estrada de Thundrak', 'Fosso de Gorvath', 'Tribunal de Veredar', 'Vazio da Roda', 'Cemitério de Nekrath', 'Salão Infernal', 'Ruínas de Kolossar', 'Plataforma Celestial'];

export const ARENAS_DO_GUERREIRO: Readonly<Record<number, MapaDaCacada>> = Object.fromEntries(
  NOMES.map((nome, i) => [i + 1, {
    nome: TEXTOS_DO_GUERREIRO.nomeDaArena(nome),
    imagem: `/images/guerreiro/arenas/arena-${i + 1}-v1.webp`,
    videoAv1: `/videos/guerreiro/arena-${i + 1}-v1.av1.mp4`,
    videoH264: `/videos/guerreiro/arena-${i + 1}-v1.h264.mp4`,
  }])
);
