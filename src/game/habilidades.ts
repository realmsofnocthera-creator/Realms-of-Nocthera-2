import { getClassById } from '@/rules/classes';
import {
  HabilidadesEquipadas,
  SlotHabilidade,
  SLOTS_HABILIDADE,
} from '@/rules/habilidadesEquipadas';
import { ESPACO_DO_SLOT } from '@/rules/subclasseTiers';
import { SUBCLASSES } from '@/rules/subclasses';
import {
  habilidadeLiberadaPorTier,
  habilidadesDoKitDaSubclasse,
  subclasseDaHabilidade,
} from '@/game/combate/habilidades/tiers';

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
 * Habilidades de kit de subclasse que o espaço aceita: as das subclasses da classe cujo espaço é o do slot.
 * (Se a subclasse está ativa e o tier foi comprado é conferido ao equipar e no combate.)
 */
function idsDeSubclasseDoSlot(classeId: string, slot: SlotHabilidade): string[] {
  return SUBCLASSES.filter((s) => s.classeId === classeId).flatMap((s) =>
    habilidadesDoKitDaSubclasse(s.id)
      .filter((h) => h.espaco === ESPACO_DO_SLOT[slot])
      .map((h) => h.id)
  );
}

/**
 * Normaliza as habilidades equipadas de um personagem:
 * - Lança erro claro se classeId não existir.
 * - Completa espaços ausentes com o padrão da classe.
 * - Aceita as habilidades da classe e as de kit das subclasses da classe (no espaço certo).
 * - Substitui por padrão qualquer outro id.
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
    if (
      typeof idInformado === 'string' &&
      (idsValidos.includes(idInformado) || idsDeSubclasseDoSlot(classeId, slot).includes(idInformado))
    ) {
      resultado[slot] = idInformado;
    } else {
      resultado[slot] = padrao[slot];
    }
  }

  return resultado;
}

/**
 * Volta para a habilidade da classe os espaços que guardam habilidade de uma subclasse que não é a ativa
 * (usado ao trocar de subclasse).
 */
export function liberarHabilidadesDeOutraSubclasse(
  classeId: string,
  equipadas: HabilidadesEquipadas,
  subclasseAtualId: string | null | undefined
): HabilidadesEquipadas {
  const padrao = habilidadesPadraoDaClasse(classeId);
  const resultado = { ...equipadas };
  for (const slot of SLOTS_HABILIDADE) {
    const dona = subclasseDaHabilidade(equipadas[slot]);
    if (dona && dona.id !== subclasseAtualId) {
      resultado[slot] = padrao[slot];
    }
  }
  return resultado;
}

export type ResultadoEquipar = { ok: true; equipadas: HabilidadesEquipadas } | { ok: false; erro: string };

/**
 * Equipa uma habilidade num espaço: a da classe nesse espaço, ou a de kit da subclasse ativa
 * no espaço certo, com o tier comprado (básico 2, especial 3, ultimate 4).
 */
export function equiparHabilidadeNoSlot(
  personagem: {
    classeId: string;
    habilidadesEquipadas?: Partial<HabilidadesEquipadas>;
    subclasseAtualId?: string | null;
    subclasseTiers?: Record<string, number>;
  },
  slot: unknown,
  habilidadeId: unknown
): ResultadoEquipar {
  if (typeof slot !== 'string' || !(SLOTS_HABILIDADE as readonly string[]).includes(slot)) {
    return { ok: false, erro: 'Espaço de habilidade inválido' };
  }
  const slotValido = slot as SlotHabilidade;
  if (typeof habilidadeId !== 'string' || !habilidadeId) {
    return { ok: false, erro: 'Habilidade inválida' };
  }

  const padrao = habilidadesPadraoDaClasse(personagem.classeId);
  const ehDaClasse = habilidadeId === padrao[slotValido];
  const ehDeSubclasse = idsDeSubclasseDoSlot(personagem.classeId, slotValido).includes(habilidadeId);
  if (!ehDaClasse && !ehDeSubclasse) {
    return { ok: false, erro: 'Habilidade inválida' };
  }
  if (ehDeSubclasse && !habilidadeLiberadaPorTier(habilidadeId, personagem)) {
    return { ok: false, erro: 'Habilidade ainda não liberada' };
  }

  const atuais = normalizarHabilidadesEquipadas(personagem.classeId, personagem.habilidadesEquipadas);
  return { ok: true, equipadas: { ...atuais, [slotValido]: habilidadeId } };
}
