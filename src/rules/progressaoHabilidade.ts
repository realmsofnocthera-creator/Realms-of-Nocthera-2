/**
 * Reforço e Ascensão de Habilidade (roadmap 2.2.1 e 2.2.2), valores decididos pelo Yuri em 11/10/2026.
 *
 * Reforço de Habilidade: trilha única do personagem, do nível 0 ao 30, paga com essência de habilidade.
 * Cada nível soma um bônus percentual nos 7 atributos, até +25% no nível 30.
 *
 * Ascensão de Habilidade: libera com o Reforço no nível 30. Vai do A1 ao A10 e cada passo custa
 * 1 fragmento de ascensão. Cada passo sobe uma habilidade (por espaço) para o nível 2 ou 3.
 */

export const REFORCO_NIVEL_MAXIMO = 30;
export const ASCENSAO_MAXIMA = 10;
export const ASCENSAO_REFORCO_NECESSARIO = REFORCO_NIVEL_MAXIMO;
export const ASCENSAO_CUSTO_FRAGMENTOS = 1;

/**
 * Bônus nos atributos de cada nível do Reforço, em décimos de % (para não ter conta com fração):
 * níveis 1–10 dão +0,5%, 11–20 dão +0,8% e 21–30 dão +1,2%. Total no nível 30: 250 décimos = +25%.
 */
export function bonusDoNivelReforcoDecimos(nivel: number): number {
  if (nivel < 1 || nivel > REFORCO_NIVEL_MAXIMO) return 0;
  if (nivel <= 10) return 5;
  if (nivel <= 20) return 8;
  return 12;
}

/** Bônus total nos atributos com o Reforço no nível informado, em décimos de % (nível 30 = 250). */
export function bonusReforcoTotalDecimos(nivelReforco: number): number {
  const nivel = Math.max(0, Math.min(REFORCO_NIVEL_MAXIMO, Math.floor(nivelReforco || 0)));
  let total = 0;
  for (let n = 1; n <= nivel; n++) total += bonusDoNivelReforcoDecimos(n);
  return total;
}

/** Bônus total nos atributos em % (ex.: 25 no nível 30, 5,8 no nível 11). */
export function bonusReforcoPercentual(nivelReforco: number): number {
  return bonusReforcoTotalDecimos(nivelReforco) / 10;
}

/** Custo em essência de habilidade para subir do nível n−1 para o n (índice 0 = nível 1). De 100 a 10.000. */
export const CUSTO_REFORCO_ESSENCIA: readonly number[] = [
  100, 120, 140, 160, 190, 220, 260, 300, 360, 420,
  490, 570, 670, 790, 920, 1100, 1250, 1500, 1750, 2050,
  2400, 2800, 3300, 3850, 4500, 5300, 6200, 7300, 8500, 10000,
];

/** Custo para chegar ao nível informado do Reforço (1 a 30); fora disso, null. */
export function custoDoNivelReforco(nivel: number): number | null {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > REFORCO_NIVEL_MAXIMO) return null;
  return CUSTO_REFORCO_ESSENCIA[nivel - 1];
}

/** Espaços de habilidade que a Ascensão melhora (a passiva da subclasse acompanha a Passiva I). */
export type EspacoAscensao = 'ataqueBasico' | 'habilidadeEspecial' | 'passivaI' | 'passivaII' | 'ultimate';

export interface PassoAscensao {
  ascensao: number;
  espaco: EspacoAscensao;
  nivelHabilidade: 2 | 3;
}

/** A1 a A10, na ordem decidida. */
export const PASSOS_ASCENSAO: readonly PassoAscensao[] = [
  { ascensao: 1, espaco: 'ataqueBasico', nivelHabilidade: 2 },
  { ascensao: 2, espaco: 'habilidadeEspecial', nivelHabilidade: 2 },
  { ascensao: 3, espaco: 'passivaI', nivelHabilidade: 2 },
  { ascensao: 4, espaco: 'passivaII', nivelHabilidade: 2 },
  { ascensao: 5, espaco: 'ultimate', nivelHabilidade: 2 },
  { ascensao: 6, espaco: 'ataqueBasico', nivelHabilidade: 3 },
  { ascensao: 7, espaco: 'habilidadeEspecial', nivelHabilidade: 3 },
  { ascensao: 8, espaco: 'passivaI', nivelHabilidade: 3 },
  { ascensao: 9, espaco: 'passivaII', nivelHabilidade: 3 },
  { ascensao: 10, espaco: 'ultimate', nivelHabilidade: 3 },
];

export const ROTULO_ESPACO_ASCENSAO: Readonly<Record<EspacoAscensao, string>> = {
  ataqueBasico: 'Ataque Básico',
  habilidadeEspecial: 'Habilidade Especial',
  passivaI: 'Passiva I',
  passivaII: 'Passiva II',
  ultimate: 'Ultimate',
};

export type NiveisHabilidade = Record<EspacoAscensao, number>;

/** Nível (1 a 3) de cada espaço de habilidade com a ascensão informada. */
export function niveisHabilidadePorAscensao(ascensao: number | undefined): NiveisHabilidade {
  const a = Math.max(0, Math.min(ASCENSAO_MAXIMA, Math.floor(ascensao ?? 0)));
  const niveis: NiveisHabilidade = { ataqueBasico: 1, habilidadeEspecial: 1, passivaI: 1, passivaII: 1, ultimate: 1 };
  for (const passo of PASSOS_ASCENSAO) {
    if (passo.ascensao <= a) niveis[passo.espaco] = passo.nivelHabilidade;
  }
  return niveis;
}

/** Bônus no dano ou efeito da habilidade por nível: nível 2 = +10%, nível 3 = +20%. */
export const BONUS_POR_NIVEL_HABILIDADE_PERCENTUAL: Readonly<Record<number, number>> = { 1: 0, 2: 10, 3: 20 };

export function bonusNivelHabilidadePercentual(nivelHabilidade: number | undefined): number {
  return BONUS_POR_NIVEL_HABILIDADE_PERCENTUAL[nivelHabilidade ?? 1] ?? 0;
}

/** Bônus (%) de cada espaço com a ascensão informada. */
export function bonusHabilidadePorAscensao(ascensao: number | undefined): NiveisHabilidade {
  const niveis = niveisHabilidadePorAscensao(ascensao);
  return {
    ataqueBasico: bonusNivelHabilidadePercentual(niveis.ataqueBasico),
    habilidadeEspecial: bonusNivelHabilidadePercentual(niveis.habilidadeEspecial),
    passivaI: bonusNivelHabilidadePercentual(niveis.passivaI),
    passivaII: bonusNivelHabilidadePercentual(niveis.passivaII),
    ultimate: bonusNivelHabilidadePercentual(niveis.ultimate),
  };
}

/** Aumenta um valor de passiva pelo bônus do nível (+10% ou +20% sobre o próprio valor). */
export function escalarPorNivelHabilidade(valor: number, bonusPercentual: number | undefined): number {
  if (!bonusPercentual) return valor;
  return (valor * (100 + bonusPercentual)) / 100;
}
