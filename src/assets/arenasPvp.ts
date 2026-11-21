import type { MapaDaCacada } from '@/assets/mapasDaCacada';

/**
 * As 3 arenas de combate PvP (arte animada do Yuri): o coliseu ao pôr do sol (Arena), a plataforma celestial (Ranqueada) e o palco do torneio
 * (Campeonato). Campo contínuo, vídeo de 4 s em repetição, 720 x 1080, sem som (AV1 quando o navegador sabe tocar, H.264 no resto), com a capa
 * parada. Os arquivos levam versão no nome (pvp-arena-v1) porque ficam em cache por um ano. Gerados por `scripts/arena/arenas.py`.
 */
export type ModoDoPvp = 'arena' | 'ranqueada' | 'campeonato';

const NOMES: Readonly<Record<ModoDoPvp, string>> = { arena: 'Coliseu ao Pôr do Sol', ranqueada: 'Plataforma Celestial', campeonato: 'Palco do Torneio' };

const arena = (m: ModoDoPvp): MapaDaCacada => ({
  nome: `Arena de combate: ${NOMES[m]}`,
  imagem: `/images/arena/pvp/pvp-${m}-v1.webp`,
  videoAv1: `/videos/arena/pvp-${m}-v1.av1.mp4`,
  videoH264: `/videos/arena/pvp-${m}-v1.h264.mp4`,
});

export const ARENAS_PVP: Readonly<Record<ModoDoPvp, MapaDaCacada>> = { arena: arena('arena'), ranqueada: arena('ranqueada'), campeonato: arena('campeonato') };
