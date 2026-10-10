import { HABILIDADES_BERSERKER, PASSIVA_BERSERKER } from './subclasses/berserker';
import { HABILIDADES_COLOSSO, PASSIVA_COLOSSO } from './subclasses/colosso';
import { HABILIDADES_DUELISTA, PASSIVA_DUELISTA } from './subclasses/duelista';
import { HABILIDADES_ASSASSINO, PASSIVA_ASSASSINO } from './subclasses/assassino';
import { HABILIDADES_RONIN, PASSIVA_RONIN } from './subclasses/ronin';
import { HABILIDADES_KENSEI, PASSIVA_KENSEI } from './subclasses/kensei';
import { HABILIDADES_BASTIAO, PASSIVA_BASTIAO } from './subclasses/bastiao';
import { HABILIDADES_VANGUARDA, PASSIVA_VANGUARDA } from './subclasses/vanguarda';
import { HABILIDADES_SACERDOTE, PASSIVA_SACERDOTE } from './subclasses/sacerdote';
import { HABILIDADES_INQUISIDOR, PASSIVA_INQUISIDOR } from './subclasses/inquisidor';
import { DefinicaoHabilidade, DefinicaoPassiva } from './tipos';

/** Kits de subclasse que o jogo já tem. Novas subclasses entram aqui. */
export const HABILIDADES_PADRAO: readonly DefinicaoHabilidade[] = [
  ...HABILIDADES_BERSERKER,
  ...HABILIDADES_COLOSSO,
  ...HABILIDADES_VANGUARDA,
  ...HABILIDADES_BASTIAO,
  ...HABILIDADES_KENSEI,
  ...HABILIDADES_RONIN,
  ...HABILIDADES_ASSASSINO,
  ...HABILIDADES_DUELISTA,
  ...HABILIDADES_SACERDOTE,
  ...HABILIDADES_INQUISIDOR,
];

export const PASSIVAS_PADRAO: readonly DefinicaoPassiva[] = [PASSIVA_BERSERKER, PASSIVA_COLOSSO, PASSIVA_VANGUARDA, PASSIVA_BASTIAO, PASSIVA_KENSEI, PASSIVA_RONIN, PASSIVA_ASSASSINO, PASSIVA_DUELISTA, PASSIVA_SACERDOTE, PASSIVA_INQUISIDOR];
