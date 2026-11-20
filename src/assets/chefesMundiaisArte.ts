/**
 * A arte dos 7 chefes mundiais (pixel art do Yuri). Cada chefe é uma CENA: a arena com o chefe já desenhado, em 4 vídeos de laço
 * ou de uma vez (720 x 1080, sem som: AV1 quando o navegador sabe tocar e H.264 no resto):
 *  - idle: o chefe respirando (laço de 4 s);
 *  - ataque: o chefe ataca (1,7 s, com a onda de choque no chão);
 *  - furia: o chefe enfurecido, com a tela avermelhada (laço de 2 s);
 *  - golpe: o chefe leva um golpe e pisca em branco (0,6 s).
 * A cena parada (`arena`) é a capa enquanto o vídeo carrega e o fundo de quem pede "reduzir movimento"; a `camada` é o chefe sozinho
 * (226 x 300) para as telas. Gerados por `scripts/chefe-mundial/converter.py`.
 */
export type EstadoDoChefeMundial = 'idle' | 'ataque' | 'furia' | 'golpe';
export const ESTADOS_DO_CHEFE_MUNDIAL: readonly EstadoDoChefeMundial[] = ['idle', 'ataque', 'furia', 'golpe'];

export interface ClipeDoChefe {
  av1: string;
  h264: string;
}

/** Onde o chefe está na cena, em fração da largura e da altura (para os efeitos, os números e a vida caírem nele). */
export interface AlvoDoChefe {
  x: number;
  pes: number;
  altura: number;
}

export interface ArteDoChefeMundial {
  arena: string;
  camada: string;
  clipes: Readonly<Record<EstadoDoChefeMundial, ClipeDoChefe>>;
  alvo: AlvoDoChefe;
}

const clipe = (id: string, estado: EstadoDoChefeMundial): ClipeDoChefe => ({
  av1: `/videos/chefe-mundial/${id}-${estado}-v1.av1.mp4`,
  h264: `/videos/chefe-mundial/${id}-${estado}-v1.h264.mp4`,
});

const arte = (id: string, alvo: AlvoDoChefe): ArteDoChefeMundial => ({
  arena: `/images/chefe-mundial/${id}-arena.webp`,
  camada: `/images/chefe-mundial/${id}-camada.webp`,
  clipes: { idle: clipe(id, 'idle'), ataque: clipe(id, 'ataque'), furia: clipe(id, 'furia'), golpe: clipe(id, 'golpe') },
  alvo,
});

/** O alvo de cada chefe foi medido na cena (a diferença entre a arena com e sem o chefe). */
export const ARTE_DOS_CHEFES_MUNDIAIS: Readonly<Record<string, ArteDoChefeMundial>> = {
  solvaris: arte('solvaris', { x: 0.499, pes: 0.583, altura: 0.548 }),
  pyrathon: arte('pyrathon', { x: 0.499, pes: 0.62, altura: 0.553 }),
  cryonax: arte('cryonax', { x: 0.497, pes: 0.583, altura: 0.553 }),
  zephyrak: arte('zephyrak', { x: 0.499, pes: 0.587, altura: 0.554 }),
  nyxoloth: arte('nyxoloth', { x: 0.5, pes: 0.528, altura: 0.487 }),
  xerothul: arte('xerothul', { x: 0.5, pes: 0.593, altura: 0.547 }),
  orvakar: arte('orvakar', { x: 0.499, pes: 0.624, altura: 0.554 }),
};

/** O momento (ms desde o começo do ataque) em que a onda de choque do chefe atinge o herói (estimado pela animação). */
export const IMPACTO_DO_ATAQUE_DO_CHEFE_MS = 950;
/** A duração (ms) dos clipes de uma vez. */
export const DURACAO_DO_CLIPE_MS: Readonly<Record<'ataque' | 'golpe', number>> = { ataque: 1667, golpe: 583 };
