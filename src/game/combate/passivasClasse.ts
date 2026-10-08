/**
 * Passivas de classe que dependem só de números (sem estado de combate).
 *
 * Ficam fora de combat.ts para que o registro de habilidades (combate/habilidades/) possa
 * usá-las sem importar o motor inteiro: antes, combat.ts → habilidades → danoBase.ts →
 * combat.ts formava um ciclo de imports (Ordem 46C).
 */

/**
 * Passiva I do Bárbaro (Nível 12+) — Instinto de Sobrevivência:
 * Função pura que calcula o bônus dinâmico a partir do %HP atual do Bárbaro no momento do ataque
 * (abaixo de 50% ou abaixo de 25%, sem acumular).
 */
export function calcularInstintoSobrevivencia(
  hpAtual: number,
  hpMax: number,
  nivel: number = 12
): {
  ativo: boolean;
  faixa: 'normal' | 'abaixo50' | 'abaixo25';
  bonusForca: number;
  percentualBonusDano: number;
} {
  if (nivel < 12 || hpMax <= 0 || hpAtual <= 0) {
    return {
      ativo: false,
      faixa: 'normal',
      bonusForca: 0,
      percentualBonusDano: 0,
    };
  }

  const percentualHp = (hpAtual / hpMax) * 100;

  // Abaixo de 25% de HP (não acumula com a faixa de 50%)
  if (percentualHp < 25) {
    return {
      ativo: true,
      faixa: 'abaixo25',
      bonusForca: 4,
      percentualBonusDano: 20,
    };
  }

  // Abaixo de 50% de HP
  if (percentualHp < 50) {
    return {
      ativo: true,
      faixa: 'abaixo50',
      bonusForca: 2,
      percentualBonusDano: 10,
    };
  }

  return {
    ativo: false,
    faixa: 'normal',
    bonusForca: 0,
    percentualBonusDano: 0,
  };
}
