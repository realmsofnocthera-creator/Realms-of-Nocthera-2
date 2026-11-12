import { srcDaImagem } from '@/assets/srcDaImagem';
import imgBerserkerEstandarte from './images/subclasses/berserker-estandarte.webp';
import imgBerserkerPersonagem from './images/subclasses/berserker-personagem.webp';
import imgColossoEstandarte from './images/subclasses/colosso-estandarte.webp';
import imgColossoPersonagem from './images/subclasses/colosso-personagem.webp';
import imgVanguardaEstandarte from './images/subclasses/vanguarda-estandarte.webp';
import imgBastiaoEstandarte from './images/subclasses/bastiao-estandarte.webp';
import imgCavaleiroPersonagem from './images/subclasses/cavaleiro-personagem.webp';

/** A arte de uma subclasse: o estandarte (o personagem fica ao lado dele). Largura / altura de cada imagem, para a proporção certa. */
export interface ArteDaSubclasse {
  estandarte: string;
  personagem: string;
  proporcaoDoEstandarte: number;
  proporcaoDoPersonagem: number;
}

/**
 * As subclasses com arte (folhas do Yuri). A Vanguarda e o Bastião dividem, por enquanto, o cavaleiro negro agachado com a
 * espada nas costas. As outras subclasses ainda não têm arte e aparecem com o degradê da cor da classe.
 */
export const ARTE_DAS_SUBCLASSES: Readonly<Record<string, ArteDaSubclasse>> = {
  berserker: { estandarte: srcDaImagem(imgBerserkerEstandarte), personagem: srcDaImagem(imgBerserkerPersonagem), proporcaoDoEstandarte: 334 / 918, proporcaoDoPersonagem: 371 / 738 },
  colosso: { estandarte: srcDaImagem(imgColossoEstandarte), personagem: srcDaImagem(imgColossoPersonagem), proporcaoDoEstandarte: 334 / 918, proporcaoDoPersonagem: 427 / 779 },
  vanguarda: { estandarte: srcDaImagem(imgVanguardaEstandarte), personagem: srcDaImagem(imgCavaleiroPersonagem), proporcaoDoEstandarte: 292 / 905, proporcaoDoPersonagem: 464 / 463 },
  bastiao: { estandarte: srcDaImagem(imgBastiaoEstandarte), personagem: srcDaImagem(imgCavaleiroPersonagem), proporcaoDoEstandarte: 293 / 908, proporcaoDoPersonagem: 464 / 463 },
};

export function arteDaSubclasse(subclasseId: string): ArteDaSubclasse | null {
  return ARTE_DAS_SUBCLASSES[subclasseId] ?? null;
}
