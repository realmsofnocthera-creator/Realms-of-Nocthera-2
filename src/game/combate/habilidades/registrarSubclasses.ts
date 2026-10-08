import {
  obterHabilidade,
  registrarHabilidade,
  obterPassiva,
  registrarPassiva,
} from './registro';
import { HABILIDADES_BERSERKER, PASSIVA_BERSERKER } from './subclasses/berserker';
import { HABILIDADES_COLOSSO, PASSIVA_COLOSSO } from './subclasses/colosso';

const TODAS_HABILIDADES_SUBCLASSE = [
  ...HABILIDADES_BERSERKER,
  ...HABILIDADES_COLOSSO,
];

const TODAS_PASSIVAS_SUBCLASSE = [
  PASSIVA_BERSERKER,
  PASSIVA_COLOSSO,
];

/**
 * Registra todas as habilidades e passivas de subclasses conhecidas no registro central.
 * Função idempotente: caso uma habilidade ou passiva já esteja registrada, ela é ignorada sem lançar erro.
 */
export function registrarHabilidadesDeSubclasse(): void {
  for (const hab of TODAS_HABILIDADES_SUBCLASSE) {
    if (!obterHabilidade(hab.id)) {
      registrarHabilidade(hab);
    }
  }

  for (const passiva of TODAS_PASSIVAS_SUBCLASSE) {
    if (!obterPassiva(passiva.id)) {
      registrarPassiva(passiva);
    }
  }
}
