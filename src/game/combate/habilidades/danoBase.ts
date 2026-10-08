import { calcularInstintoSobrevivencia } from '../../combat';

export interface AplicarPassivasDanoParams {
  classeId: string;
  danoBasePlano: number;
  hp: number;
  hpMax: number;
  nivel: number;
}

/**
 * Aplica passivas de aumento de dano base de classe sobre o dano base plano (físico ou mágico).
 */
export function aplicarPassivasDanoDaClasse(params: {
  classeId: string;
  danoBasePlano: number;
  hp: number;
  hpMax: number;
  nivel: number;
}): number {
  const { classeId, danoBasePlano, hp, hpMax, nivel } = params;
  const classeNorm = classeId.trim().toLowerCase();

  if (classeNorm === 'barbaro') {
    const instinto = calcularInstintoSobrevivencia(hp, hpMax, nivel);
    return Math.ceil(
      (danoBasePlano + instinto.bonusForca) * (1 + instinto.percentualBonusDano / 100)
    );
  }

  // TODO: cargas de passivas das outras classes entram junto com cada subclasse
  return danoBasePlano;
}
