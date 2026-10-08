import { calcularInstintoSobrevivencia } from '@/game/combate/passivasClasse';

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
export function separarPassivasDanoDaClasse(params: {
  classeId: string;
  danoBasePlano: number;
  hp: number;
  hpMax: number;
  nivel: number;
}): { danoBase: number; bonusDanoPercentual: number } {
  const { classeId, danoBasePlano, hp, hpMax, nivel } = params;
  const classeNorm = classeId.trim().toLowerCase();

  if (classeNorm === 'barbaro') {
    // O bônus fixo de Força entra no dano base; o percentual do Instinto vai para o grupo
    // de soma (regra 1.2.2), junto com os demais bônus de dano.
    const instinto = calcularInstintoSobrevivencia(hp, hpMax, nivel);
    return {
      danoBase: danoBasePlano + instinto.bonusForca,
      bonusDanoPercentual: instinto.percentualBonusDano,
    };
  }

  // TODO: cargas de passivas das outras classes entram junto com cada subclasse
  return { danoBase: danoBasePlano, bonusDanoPercentual: 0 };
}

/** Versão que já aplica o percentual sozinho (dano base isolado, sem outros bônus). */
export function aplicarPassivasDanoDaClasse(params: {
  classeId: string;
  danoBasePlano: number;
  hp: number;
  hpMax: number;
  nivel: number;
}): number {
  const { danoBase, bonusDanoPercentual } = separarPassivasDanoDaClasse(params);
  return Math.ceil((danoBase * (100 + bonusDanoPercentual)) / 100);
}
