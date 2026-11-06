import hubImg from './images/colecao/hub.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

/** O fundo do hub da Coleção (941×1672): cinco quadros, um para cada parte da coleção. */
export const FUNDO_DO_HUB_DA_COLECAO = srcDaImagem(hubImg);

export const QUADROS_DA_COLECAO = ['reliquias', 'sonatas', 'ecos', 'memorias', 'alma'] as const;
export type QuadroDaColecao = (typeof QUADROS_DA_COLECAO)[number];

/** Onde fica cada quadro no fundo, em pixels da imagem original (x, y, largura, altura). */
const QUADROS: Readonly<Record<QuadroDaColecao, readonly [number, number, number, number]>> = {
  reliquias: [60, 230, 312, 410], // canto superior esquerdo
  sonatas: [578, 235, 302, 433], // canto superior direito
  alma: [330, 505, 278, 540], // o espelho do meio, a carta de alma
  ecos: [8, 745, 304, 480], // canto inferior esquerdo
  memorias: [628, 785, 297, 450], // canto inferior direito
};

/** A área clicável de cada quadro, em % do fundo. */
export const AREAS_DO_HUB_DA_COLECAO: Readonly<Record<QuadroDaColecao, { left: string; top: string; width: string; height: string }>> = Object.fromEntries(
  (Object.entries(QUADROS) as [QuadroDaColecao, readonly [number, number, number, number]][]).map(([k, [x, y, l, a]]) => [
    k,
    { left: `${(x / 941) * 100}%`, top: `${(y / 1672) * 100}%`, width: `${(l / 941) * 100}%`, height: `${(a / 1672) * 100}%` },
  ]),
) as Record<QuadroDaColecao, { left: string; top: string; width: string; height: string }>;

/** Onde o rótulo se apoia na largura do quadro (0 = esquerda, 1 = direita): nos quadros das bordas ele vem para dentro, para o celular não cortar. */
export const ANCORA_DO_ROTULO: Readonly<Record<QuadroDaColecao, number>> = { reliquias: 0.5, sonatas: 0.5, alma: 0.5, ecos: 0.72, memorias: 0.28 };
