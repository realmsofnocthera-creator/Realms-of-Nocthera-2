import { srcDaImagem } from '@/assets/srcDaImagem';
import { TROFEUS } from '@/assets/conquistas';
import imgPodio from './images/ranking/podio.webp';
import imgPoder from './images/ranking/icone-poder.webp';
import imgNivel from './images/ranking/icone-nivel.webp';
import imgTorre from './images/ranking/icone-torre.webp';
import imgBatalha from './images/ranking/icone-batalha.webp';
import imgGuerreiro from './images/ranking/icone-guerreiro.webp';
import type { CriterioDeRanking } from '@/rules/social';

/** O pódio do Ranking (três pedestais com estandartes azuis e dourado). */
export const PODIO = srcDaImagem(imgPodio);

/** A aba "Poder Total" (a principal) ainda não tem dados no servidor; as outras são os rankings que já existem. */
export type AbaDoRanking = 'poder' | CriterioDeRanking;

export interface DefinicaoDaAbaDoRanking {
  id: AbaDoRanking;
  nome: string;
  /** O nome curto, para a barra de baixo. */
  curto: string;
  icone: string;
  /** Em breve: aparece com um cadeado e explica que ainda não abriu. */
  bloqueada?: boolean;
}

/** Os 5 emblemas da folha do Yuri, na ordem da barra de baixo (Poder Total primeiro, por ser o principal). */
export const ABAS_DO_RANKING: readonly DefinicaoDaAbaDoRanking[] = [
  { id: 'poder', nome: 'Poder Total', curto: 'Poder', icone: srcDaImagem(imgPoder), bloqueada: true },
  { id: 'nivel', nome: 'Nível', curto: 'Nível', icone: srcDaImagem(imgNivel) },
  { id: 'torre', nome: 'Torre Celestial', curto: 'Torre', icone: srcDaImagem(imgTorre) },
  { id: 'batalha', nome: 'Batalha Sangrenta', curto: 'Batalha', icone: srcDaImagem(imgBatalha) },
  { id: 'guerreiro', nome: 'Guerreiro', curto: 'Guerreiro', icone: srcDaImagem(imgGuerreiro) },
];

export const EXPLICACAO_DO_PODER = 'O personagem mais forte do reino: a soma dos atributos, com o equipamento. Esta aba abre em breve.';

/** A medalha de cada lugar do pódio (1º ouro, 2º prata, 3º bronze). */
export const MEDALHAS_DO_PODIO = [TROFEUS.ouro, TROFEUS.prata, TROFEUS.bronze] as const;

/** A cor do feixe de luz atrás de cada lugar do pódio: dourado no 1º, azul no 2º e verde no 3º. */
export const FEIXES_DO_PODIO = ['#FFC83D', '#4DA3FF', '#5FD37A'] as const;
