import { getClassById } from '@/rules/classes';
import { SlotHabilidade } from '@/rules/habilidadesEquipadas';

/**
 * Mapeia o nome da habilidade acionada de uma classe para o respectivo slot equipável:
 * - 'ataqueBasico'
 * - 'habilidadeEspecial'
 * - 'ultimate'
 *
 * Se habilidadeAcionada for undefined ou bater com ataqueBasico.nome -> 'ataqueBasico'.
 * Se a classe não existir ou o nome for desconhecido -> null.
 */
export function obterSlotAcionado(
  classeId: string,
  habilidadeAcionada: string | undefined
): SlotHabilidade | null {
  const classe = getClassById(classeId);
  if (!classe) return null;

  const { ataqueBasico, habilidadeEspecial, ultimate } = classe.progressao;

  if (!habilidadeAcionada || habilidadeAcionada === ataqueBasico.nome) {
    return 'ataqueBasico';
  }
  if (habilidadeAcionada === habilidadeEspecial.nome) {
    return 'habilidadeEspecial';
  }
  if (habilidadeAcionada === ultimate.nome) {
    return 'ultimate';
  }

  return null;
}
