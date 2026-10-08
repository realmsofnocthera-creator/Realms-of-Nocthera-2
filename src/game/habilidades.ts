import { getClassById } from '../rules/classes';
import {
  HabilidadesEquipadas,
  SLOTS_HABILIDADE,
} from '../rules/habilidadesEquipadas';

/**
 * Retorna os 3 IDs das habilidades dos espaços equipáveis da classe
 * ('ataqueBasico', 'habilidadeEspecial', 'ultimate').
 * Lança erro se classeId não existir.
 */
export function idsHabilidadesDaClasse(classeId: string): string[] {
  const classe = getClassById(classeId);
  if (!classe) {
    throw new Error(`Classe "${classeId}" não encontrada.`);
  }
  return [
    classe.progressao.ataqueBasico.id,
    classe.progressao.habilidadeEspecial.id,
    classe.progressao.ultimate.id,
  ];
}

/**
 * Retorna a configuração padrão de habilidades equipadas para uma classe.
 * Lança erro se classeId não existir.
 */
export function habilidadesPadraoDaClasse(classeId: string): HabilidadesEquipadas {
  const classe = getClassById(classeId);
  if (!classe) {
    throw new Error(`Classe "${classeId}" não encontrada.`);
  }
  return {
    ataqueBasico: classe.progressao.ataqueBasico.id,
    habilidadeEspecial: classe.progressao.habilidadeEspecial.id,
    ultimate: classe.progressao.ultimate.id,
  };
}

/**
 * Normaliza as habilidades equipadas de um personagem:
 * - Lança erro claro se classeId não existir.
 * - Completa espaços ausentes com o padrão da classe.
 * - Substitui por padrão qualquer id que não pertença à classe.
 */
export function normalizarHabilidadesEquipadas(
  classeId: string,
  equipadas?: Partial<HabilidadesEquipadas>
): HabilidadesEquipadas {
  const padrao = habilidadesPadraoDaClasse(classeId);
  const idsValidos = idsHabilidadesDaClasse(classeId);

  const resultado: HabilidadesEquipadas = {
    ataqueBasico: padrao.ataqueBasico,
    habilidadeEspecial: padrao.habilidadeEspecial,
    ultimate: padrao.ultimate,
  };

  for (const slot of SLOTS_HABILIDADE) {
    const idInformado = equipadas?.[slot];
    if (typeof idInformado === 'string' && idsValidos.includes(idInformado)) {
      resultado[slot] = idInformado;
    } else {
      resultado[slot] = padrao[slot];
    }
  }

  return resultado;
}
