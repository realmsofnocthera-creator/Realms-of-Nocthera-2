import { srcDaImagem } from '@/assets/srcDaImagem';
import imgBerserkerEstandarte from './images/subclasses/berserker-estandarte.webp';
import imgBerserkerPersonagem from './images/subclasses/berserker-personagem.webp';
import imgColossoEstandarte from './images/subclasses/colosso-estandarte.webp';
import imgColossoPersonagem from './images/subclasses/colosso-personagem.webp';
import imgVanguardaPersonagem from './images/subclasses/vanguarda-personagem.webp';
import imgBastiaoPersonagem from './images/subclasses/bastiao-personagem.webp';

/** A arte de uma subclasse: o estandarte (o personagem fica ao lado dele). Largura / altura de cada imagem, para a proporção certa. */
export interface ArteDaSubclasse {
  /** O estandarte (a Vanguarda e o Bastião ainda não têm). */
  estandarte: string | null;
  personagem: string;
  proporcaoDoEstandarte: number;
  proporcaoDoPersonagem: number;
}

/**
 * As subclasses com arte (folhas do Yuri): o Berserker é o cavaleiro de armadura negra agachado, com a espada nas costas,
 * e o Colosso é o guerreiro de armadura dourada e elmo. As outras subclasses ainda não têm arte e aparecem com o degradê
 * da cor da classe. A Vanguarda (espada) e o Bastião (escudo e maça) já têm o personagem, mas ainda não o estandarte.
 */
export const ARTE_DAS_SUBCLASSES: Readonly<Record<string, ArteDaSubclasse>> = {
  berserker: { estandarte: srcDaImagem(imgBerserkerEstandarte), personagem: srcDaImagem(imgBerserkerPersonagem), proporcaoDoEstandarte: 292 / 905, proporcaoDoPersonagem: 464 / 463 },
  colosso: { estandarte: srcDaImagem(imgColossoEstandarte), personagem: srcDaImagem(imgColossoPersonagem), proporcaoDoEstandarte: 334 / 918, proporcaoDoPersonagem: 427 / 779 },
  vanguarda: { estandarte: null, personagem: srcDaImagem(imgVanguardaPersonagem), proporcaoDoEstandarte: 0, proporcaoDoPersonagem: 723 / 998 },
  bastiao: { estandarte: null, personagem: srcDaImagem(imgBastiaoPersonagem), proporcaoDoEstandarte: 0, proporcaoDoPersonagem: 700 / 966 },
};

export function arteDaSubclasse(subclasseId: string): ArteDaSubclasse | null {
  return ARTE_DAS_SUBCLASSES[subclasseId] ?? null;
}
