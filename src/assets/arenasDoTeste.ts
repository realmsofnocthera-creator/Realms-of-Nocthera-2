import type { MapaDaCacada } from '@/assets/mapasDaCacada';
import type { CategoriaDoTeste } from '@/rules/testeEquipe';

/**
 * As 3 arenas do Teste de Equipe (arte animada do Yuri), uma para cada teste: campo contínuo, vídeo de 4 s em repetição, 720 x 1080, sem
 * som (AV1 quando o navegador sabe tocar, H.264 no resto), com a capa parada. Os arquivos levam versão no nome (arena-alma-v1) porque
 * ficam em cache por um ano. Gerados por `scripts/teste-equipe/arenas.py`.
 */
const NOMES: Readonly<Record<CategoriaDoTeste, string>> = { alma: 'Santuário das Almas', corpo: 'Templo Forja de Ossos', mente: 'Bosque de Raízes' };

const arena = (c: CategoriaDoTeste): MapaDaCacada => ({
  nome: `Arena do Teste de Equipe: ${NOMES[c]}`,
  imagem: `/images/teste-equipe/arenas/arena-${c}-v1.webp`,
  videoAv1: `/videos/teste-equipe/arena-${c}-v1.av1.mp4`,
  videoH264: `/videos/teste-equipe/arena-${c}-v1.h264.mp4`,
});

export const ARENAS_DO_TESTE: Readonly<Record<CategoriaDoTeste, MapaDaCacada>> = { alma: arena('alma'), corpo: arena('corpo'), mente: arena('mente') };
