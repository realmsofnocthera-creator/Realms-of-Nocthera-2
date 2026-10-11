import { ATTRIBUTES, Attributes } from '@/rules/attributes';
import {
  ASCENSAO_CUSTO_FRAGMENTOS,
  ASCENSAO_MAXIMA,
  ASCENSAO_REFORCO_NECESSARIO,
  bonusReforcoTotalDecimos,
  custoDoNivelReforco,
  REFORCO_NIVEL_MAXIMO,
} from '@/rules/progressaoHabilidade';

/**
 * Atributos com o bônus do Reforço de Habilidade (2.2.2): cada atributo ganha o % do nível,
 * arredondado para baixo (nunca dá mais que o %). Os atributos gravados no personagem não mudam;
 * o bônus é calculado na hora, como os derivados.
 */
export function aplicarReforcoAtributos(atributos: Attributes, nivelReforco: number | undefined): Attributes {
  const decimos = bonusReforcoTotalDecimos(nivelReforco ?? 0);
  if (decimos <= 0) return atributos;
  const resultado = { ...atributos };
  for (const attr of ATTRIBUTES) {
    resultado[attr] = Math.floor((atributos[attr] * (1000 + decimos)) / 1000);
  }
  return resultado;
}

/** Quanto o Reforço soma em cada atributo (diferença entre os atributos com e sem o bônus). */
export function bonusReforcoEmAtributos(atributos: Attributes, nivelReforco: number | undefined): Attributes {
  const com = aplicarReforcoAtributos(atributos, nivelReforco);
  const bonus = { ...atributos };
  for (const attr of ATTRIBUTES) bonus[attr] = com[attr] - atributos[attr];
  return bonus;
}

export type MotivoBloqueioReforco = 'nivelMaximo' | 'essenciaInsuficiente';

/** Próximo nível do Reforço: custo e se dá para subir com o saldo informado. */
export function proximoNivelReforco(
  nivelAtual: number | undefined,
  essencia: number | undefined
): { nivel: number; custo: number; motivo?: MotivoBloqueioReforco } | null {
  const atual = Math.max(0, Math.floor(nivelAtual ?? 0));
  if (atual >= REFORCO_NIVEL_MAXIMO) return null;
  const nivel = atual + 1;
  const custo = custoDoNivelReforco(nivel) as number;
  return (essencia ?? 0) < custo ? { nivel, custo, motivo: 'essenciaInsuficiente' } : { nivel, custo };
}

export type MotivoBloqueioAscensao = 'reforcoIncompleto' | 'fragmentosInsuficientes';

/** Próxima Ascensão (A1 a A10): custo e o que falta. Null quando já está no A10. */
export function proximaAscensao(
  ascensaoAtual: number | undefined,
  nivelReforco: number | undefined,
  fragmentos: number | undefined
): { ascensao: number; custo: number; motivo?: MotivoBloqueioAscensao } | null {
  const atual = Math.max(0, Math.floor(ascensaoAtual ?? 0));
  if (atual >= ASCENSAO_MAXIMA) return null;
  const base = { ascensao: atual + 1, custo: ASCENSAO_CUSTO_FRAGMENTOS };
  if ((nivelReforco ?? 0) < ASCENSAO_REFORCO_NECESSARIO) return { ...base, motivo: 'reforcoIncompleto' };
  if ((fragmentos ?? 0) < ASCENSAO_CUSTO_FRAGMENTOS) return { ...base, motivo: 'fragmentosInsuficientes' };
  return base;
}
