import { PASSIVA_POR_SUBCLASSE, TIER_PASSIVA_SUBCLASSE } from '../../../rules/subclasseKits';
import { obterPassiva } from './registro';
import { ModificadoresPassiva } from './tipos';

const MODIFICADORES_ZERADOS: ModificadoresPassiva = {
  bonusDanoFisicoPercentual: 0,
  reducaoDanoFisicoRecebidoPercentual: 0,
  bonusSobreescudoMaxPercentual: 0,
};

export interface ContextoPassivaSubclasse {
  subclasseAtualId?: string | null;
  subclasseTiers?: Record<string, number>;
  hp: number;
  hpMax: number;
  nivel?: number;
}

/**
 * Retorna os modificadores passivos ativos da subclasse do combatente.
 * Retorna zeros se:
 * - Não houver subclasse selecionada;
 * - O tier da subclasse atual for menor que TIER_PASSIVA_SUBCLASSE (1);
 * - Não houver passiva mapeada ou registrada para a subclasse.
 */
export function obterModificadoresPassivaSubclasse(
  c: ContextoPassivaSubclasse
): ModificadoresPassiva {
  if (!c.subclasseAtualId) {
    return MODIFICADORES_ZERADOS;
  }

  const subIdNorm = c.subclasseAtualId.trim().toLowerCase();
  const tier = c.subclasseTiers?.[subIdNorm] ?? 0;

  if (tier < TIER_PASSIVA_SUBCLASSE) {
    return MODIFICADORES_ZERADOS;
  }

  const passivaId = PASSIVA_POR_SUBCLASSE[subIdNorm];
  if (!passivaId) {
    return MODIFICADORES_ZERADOS;
  }

  const passivaDef = obterPassiva(passivaId);
  if (!passivaDef) {
    return MODIFICADORES_ZERADOS;
  }

  return passivaDef.modificadores({
    hp: c.hp,
    hpMax: c.hpMax,
    nivel: c.nivel ?? 1,
  });
}
