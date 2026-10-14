import type { Elemento } from '@/rules/elements';
import type { EfeitoStatus } from '@/rules/statusEffects';
import type { EmblemasNoCombate } from '../emblemasEfeitos';

/**
 * O que o equipamento muda no combate, já calculado pela ficha (`calcularFichaEquipamento`). O motor só lê estes
 * campos: não conhece armas nem peças. Os pontos de atributo, o HP e a defesa entram nos atributos e na mitigação
 * do combatente antes da luta, e não aparecem aqui.
 */
export interface EquipamentoCombate {
  /** Bônus de dano físico e mágico (%), na mesma soma dos outros bônus de dano (regra 1.2.2). */
  bonusDanoFisicoPercentual: number;
  bonusDanoMagicoPercentual: number;
  /** Pontos percentuais somados à chance de crítico. */
  bonusChanceCriticoPontos: number;
  /** Pontos percentuais somados à chance de aplicar status (os da arma e os das habilidades). */
  bonusChanceEfeitosPontos: number;
  /** Status da arma: cada golpe que causa dano tenta aplicá-los com a chance base do status. */
  statusArma: readonly EfeitoStatus[];
  /** Elementos da arma: com dois, alternam por rodada. */
  elementosArma: readonly Elemento[];
  /** Habilidades de armadura (nível já somado entre as peças) que dependem do estado da luta. */
  habilidadesArmadura?: Readonly<Record<string, number>>;
  /** Efeitos das habilidades dos emblemas que o motor lê: DEF, dano por elemento e redução do dano recebido. */
  emblemas?: EmblemasNoCombate;
  /** Sobreescudo máximo do personagem (o Poder Máximo nível 5 vale até o primeiro golpe sofrido). */
  sobreescudoMaximo?: number;
}

/** Elemento do golpe da arma na rodada: com dois elementos, alternam (1ª rodada no primeiro). */
export function elementoDaArmaNaRodada(elementos: readonly Elemento[], rodada: number): Elemento | undefined {
  if (elementos.length === 0) return undefined;
  return elementos[(Math.max(1, Math.floor(rodada)) - 1) % elementos.length];
}
