import { HABILIDADES_BERSERKER, PASSIVA_BERSERKER } from './subclasses/berserker';
import { HABILIDADES_COLOSSO, PASSIVA_COLOSSO } from './subclasses/colosso';
import { DefinicaoHabilidade, DefinicaoPassiva } from './tipos';

/** Kits de subclasse que o jogo já tem. Novas subclasses entram aqui. */
export const HABILIDADES_PADRAO: readonly DefinicaoHabilidade[] = [
  ...HABILIDADES_BERSERKER,
  ...HABILIDADES_COLOSSO,
];

export const PASSIVAS_PADRAO: readonly DefinicaoPassiva[] = [PASSIVA_BERSERKER, PASSIVA_COLOSSO];
