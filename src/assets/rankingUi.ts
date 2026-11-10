import { srcDaImagem } from '@/assets/srcDaImagem';
import { PROVACOES_IMAGES } from '@/assets/provacoes';
import { TROFEUS } from '@/assets/conquistas';
import imgPodio from './images/ranking/podio.webp';
import type { CriterioDeRanking } from '@/rules/social';

/** O pódio do Ranking (três pedestais com estandartes azuis e dourado). */
export const PODIO = srcDaImagem(imgPodio);

/** A arte do cartão de cada ranking: as provações já têm título; o Nível usa o troféu dourado sobre um fundo próprio (provisório, até haver um banner). */
export const ARTE_DO_RANKING: Readonly<Record<CriterioDeRanking, { src: string; comTitulo: boolean; icone?: boolean }>> = {
  nivel: { src: TROFEUS.ouro, comTitulo: false, icone: true },
  torre: { src: PROVACOES_IMAGES['provacao-torre-celestial'], comTitulo: true },
  batalha: { src: PROVACOES_IMAGES['provacao-batalha-sangrenta'], comTitulo: true },
  guerreiro: { src: PROVACOES_IMAGES['provacao-guerreiro'], comTitulo: true },
};

/** A medalha de cada lugar do pódio (1º ouro, 2º prata, 3º bronze). */
export const MEDALHAS_DO_PODIO = [TROFEUS.ouro, TROFEUS.prata, TROFEUS.bronze] as const;
