import { ATTRIBUTES, Attributes } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { Subclasse, SUBCLASSES } from '@/rules/subclasses';
import { custoDoTier } from '@/rules/subclasseTiers';

/**
 * Retorna as subclasses pertencentes à classe informada.
 */
export function subclassesDaClasse(classeId: string): Subclasse[] {
  const normalizado = classeId.trim().toLowerCase();
  return SUBCLASSES.filter((sub) => sub.classeId === normalizado);
}

/**
 * Obtém uma subclasse específica pelo seu ID.
 */
export function obterSubclasse(id: string): Subclasse | undefined {
  const normalizado = id.trim().toLowerCase();
  return SUBCLASSES.find((sub) => sub.id === normalizado);
}

export interface RequisitosDesbloqueioInput {
  nivel: number;
  ouro: number;
  fragmentosAlma: number;
}

export interface RequisitosDesbloqueioResultado {
  ok: boolean;
  motivo?: string;
}

/**
 * Verifica se os requisitos de desbloqueio de uma subclasse são atendidos.
 */
export function verificarRequisitosDesbloqueio(
  input: RequisitosDesbloqueioInput
): RequisitosDesbloqueioResultado {
  if (input.nivel < GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO) {
    return { ok: false, motivo: 'Nível insuficiente' };
  }

  const custo = custoDoTier(0);
  if (input.ouro < custo.ouro) {
    return { ok: false, motivo: 'Ouro insuficiente' };
  }

  if (input.fragmentosAlma < custo.fragmentosAlma) {
    return { ok: false, motivo: 'Fragmentos de alma insuficientes' };
  }

  return { ok: true };
}

/**
 * Aplica o bônus de atributos da subclasse somando atributo a atributo (imutável).
 */
export function aplicarBonusSubclasse(
  atributos: Attributes,
  bonus: Attributes
): Attributes {
  return {
    vigor: atributos.vigor + (bonus.vigor || 0),
    sorte: atributos.sorte + (bonus.sorte || 0),
    forca: atributos.forca + (bonus.forca || 0),
    vitalidade: atributos.vitalidade + (bonus.vitalidade || 0),
    arcano: atributos.arcano + (bonus.arcano || 0),
    inteligencia: atributos.inteligencia + (bonus.inteligencia || 0),
    agilidade: atributos.agilidade + (bonus.agilidade || 0),
  };
}

/**
 * Subtrai exatamente o bônus de atributos informado, sem mutar os originais.
 * Lança erro caso algum atributo final fique negativo.
 */
export function removerBonusSubclasse(
  atributos: Attributes,
  bonus: Attributes
): Attributes {
  const resultado: Attributes = {
    vigor: atributos.vigor - (bonus.vigor || 0),
    sorte: atributos.sorte - (bonus.sorte || 0),
    forca: atributos.forca - (bonus.forca || 0),
    vitalidade: atributos.vitalidade - (bonus.vitalidade || 0),
    arcano: atributos.arcano - (bonus.arcano || 0),
    inteligencia: atributos.inteligencia - (bonus.inteligencia || 0),
    agilidade: atributos.agilidade - (bonus.agilidade || 0),
  };

  for (const attr of ATTRIBUTES) {
    if (resultado[attr] < 0) {
      throw new Error(`Remover o bônus de subclasse deixaria o atributo "${attr}" negativo.`);
    }
  }

  return resultado;
}
