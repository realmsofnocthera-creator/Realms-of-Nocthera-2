import { HABILIDADES_ARMADURA_MAP } from '@/rules/habilidadesArmadura';

/**
 * Poder Total do personagem (Ranking principal), decidido a partir do pedido do Yuri de 10/11/2026: a soma dos atributos
 * efetivos (os gravados, o Reforço de Habilidade, o equipamento, as peças de armadura, os emblemas e a Alma) mais os pontos
 * das habilidades de armadura. Os pontos por nível das habilidades são PROPOSTA do Claude, a confirmar: o ponto de
 * atributo vale 1 e uma habilidade de armadura vale o dobro por nível (uma peça Mítica sorteia 30 a 45 pontos de atributo,
 * então 2 habilidades no nível 3 somam 12, algo como um terço); as exclusivas dos monstros 9★ valem o dobro disso.
 */
export const PODER_POR_NIVEL_DE_HABILIDADE = 2;
export const PODER_POR_NIVEL_DE_HABILIDADE_EXCLUSIVA = 4;

/** Os pontos de Poder Total das habilidades de armadura em vigor (o nível já vem somado entre as peças e limitado ao máximo). */
export function poderDasHabilidadesDeArmadura(habilidades: Readonly<Record<string, number>> | undefined): number {
  let total = 0;
  for (const [id, nivel] of Object.entries(habilidades ?? {})) {
    const def = HABILIDADES_ARMADURA_MAP[id];
    if (!def || !(nivel > 0)) continue;
    const porNivel = def.exclusivaDe ? PODER_POR_NIVEL_DE_HABILIDADE_EXCLUSIVA : PODER_POR_NIVEL_DE_HABILIDADE;
    total += Math.min(nivel, def.nivelMaximo) * porNivel;
  }
  return total;
}
