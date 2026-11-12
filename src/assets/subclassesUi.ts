import { srcDaImagem } from '@/assets/srcDaImagem';
import imgBerserkerEstandarte from './images/subclasses/berserker-estandarte.webp';
import imgBerserkerPersonagem from './images/subclasses/berserker-personagem.webp';
import imgColossoEstandarte from './images/subclasses/colosso-estandarte.webp';
import imgColossoPersonagem from './images/subclasses/colosso-personagem.webp';
import imgVanguardaPersonagem from './images/subclasses/vanguarda-personagem.webp';
import imgBastiaoPersonagem from './images/subclasses/bastiao-personagem.webp';
import imgArquimagoPersonagem from './images/subclasses/arquimago-personagem.webp';
import imgSabioArcanoPersonagem from './images/subclasses/sabio-arcano-personagem.webp';
import imgDuelistaPersonagem from './images/subclasses/duelista-personagem.webp';
import imgAssassinoPersonagem from './images/subclasses/assassino-personagem.webp';
import imgInquisidorPersonagem from './images/subclasses/inquisidor-personagem.webp';
import imgSacerdotePersonagem from './images/subclasses/sacerdote-personagem.webp';
import imgKenseiPersonagem from './images/subclasses/kensei-personagem.webp';
import imgRoninPersonagem from './images/subclasses/ronin-personagem.webp';
import { SUBCLASSES } from '@/rules/subclasses';

/** A arte de uma subclasse: o personagem (e, se tiver, o estandarte próprio). Largura / altura de cada imagem, para a proporção certa. */
export interface ArteDaSubclasse {
  personagem: string;
  proporcaoDoPersonagem: number;
  /** O estandarte próprio (só o Berserker e o Colosso têm; as outras usam o estandarte padrão na cor da classe). */
  estandarte?: string;
  proporcaoDoEstandarte?: number;
}

/**
 * As subclasses com arte (folhas do Yuri). O Berserker é o cavaleiro de armadura negra agachado e o Colosso é o guerreiro de
 * armadura dourada e elmo, cada um com o seu estandarte. A Vanguarda (espada), o Bastião (escudo e maça), o Arquimago, a Sábia
 * Arcana, a Duelista (florete), o Assassino, o Inquisidor (capuz e cruz), o Sacerdote, o Kensei (dragão espiritual) e o Ronin (chapéu de palha) já têm o personagem: as 12 subclasses têm arte.
 */
export const ARTE_DAS_SUBCLASSES: Readonly<Record<string, ArteDaSubclasse>> = {
  berserker: { estandarte: srcDaImagem(imgBerserkerEstandarte), personagem: srcDaImagem(imgBerserkerPersonagem), proporcaoDoEstandarte: 292 / 905, proporcaoDoPersonagem: 464 / 463 },
  colosso: { estandarte: srcDaImagem(imgColossoEstandarte), personagem: srcDaImagem(imgColossoPersonagem), proporcaoDoEstandarte: 334 / 918, proporcaoDoPersonagem: 427 / 779 },
  vanguarda: { personagem: srcDaImagem(imgVanguardaPersonagem), proporcaoDoPersonagem: 723 / 998 },
  bastiao: { personagem: srcDaImagem(imgBastiaoPersonagem), proporcaoDoPersonagem: 700 / 966 },
  arquimago: { personagem: srcDaImagem(imgArquimagoPersonagem), proporcaoDoPersonagem: 770 / 992 },
  sabio_arcano: { personagem: srcDaImagem(imgSabioArcanoPersonagem), proporcaoDoPersonagem: 726 / 957 },
  duelista: { personagem: srcDaImagem(imgDuelistaPersonagem), proporcaoDoPersonagem: 843 / 1018 },
  assassino: { personagem: srcDaImagem(imgAssassinoPersonagem), proporcaoDoPersonagem: 685 / 1003 },
  inquisidor: { personagem: srcDaImagem(imgInquisidorPersonagem), proporcaoDoPersonagem: 767 / 1019 },
  sacerdote: { personagem: srcDaImagem(imgSacerdotePersonagem), proporcaoDoPersonagem: 683 / 1000 },
  kensei: { personagem: srcDaImagem(imgKenseiPersonagem), proporcaoDoPersonagem: 676 / 1003 },
  ronin: { personagem: srcDaImagem(imgRoninPersonagem), proporcaoDoPersonagem: 846 / 978 },
};

export function arteDaSubclasse(subclasseId: string): ArteDaSubclasse | null {
  return ARTE_DAS_SUBCLASSES[subclasseId] ?? null;
}

/**
 * O matiz do estandarte padrão (o vermelho do Berserker, com o emblema prateado) para a cor de cada classe:
 * assim todas as subclasses têm estandarte, até a arte própria chegar.
 */
const FILTRO_DO_ESTANDARTE: Readonly<Record<string, string>> = {
  barbaro: 'none',
  cavaleiro: 'hue-rotate(205deg)',
  samurai: 'hue-rotate(-10deg) saturate(1.1)',
  bandido: 'hue-rotate(-18deg) brightness(0.65) saturate(0.9)',
  profeta: 'hue-rotate(48deg) saturate(1.2) brightness(1.1)',
  feiticeiro: 'hue-rotate(268deg)',
};

export interface EstandarteDaSubclasse {
  src: string;
  proporcao: number;
  filtro: string;
}

/** O estandarte da subclasse: o próprio, se tiver; senão o padrão na cor da classe. */
export function estandarteDaSubclasse(subclasseId: string): EstandarteDaSubclasse {
  const arte = arteDaSubclasse(subclasseId);
  if (arte?.estandarte && arte.proporcaoDoEstandarte) return { src: arte.estandarte, proporcao: arte.proporcaoDoEstandarte, filtro: 'none' };
  const classeId = SUBCLASSES.find((s) => s.id === subclasseId)?.classeId ?? 'barbaro';
  return { src: ARTE_DAS_SUBCLASSES.berserker.estandarte as string, proporcao: ARTE_DAS_SUBCLASSES.berserker.proporcaoDoEstandarte as number, filtro: FILTRO_DO_ESTANDARTE[classeId] ?? 'none' };
}
