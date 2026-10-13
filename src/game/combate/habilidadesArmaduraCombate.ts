/**
 * Habilidades de armadura que dependem do estado da luta (parte 2): dano e crítico condicionais e a mitigação do
 * Heroísmo. O motor não conhece peças: recebe só o nível já somado de cada habilidade (a ficha do equipamento) e
 * pergunta aqui quanto cada uma vale no golpe. Tudo aditivo (regra 1.2.2); "dano" vale para físico e mágico.
 * Os números por nível (índice 0 = nível 1) seguem os textos de `src/rules/habilidadesArmadura.ts`.
 */

export type HabilidadesArmaduraAtivas = Readonly<Record<string, number>>;

export interface EstadoGolpeArmadura {
  hpAtacante: number;
  hpMaxAtacante: number;
  sobreescudoAtacante: number;
  sobreescudoMaxAtacante: number;
  hpAlvo: number;
  hpMaxAlvo: number;
  /** O alvo é um monstro Enfurecido e está abaixo de 50% de HP. */
  alvoEnfurecido: boolean;
}

const por = (valores: readonly number[], nivel: number): number => valores[Math.min(nivel, valores.length) - 1] ?? 0;
const abaixo = (hp: number, hpMax: number, limitePercentual: number) => hpMax > 0 && hp * 100 < hpMax * limitePercentual;

/** Habilidades que este módulo aplica no combate. */
export const HABILIDADES_ARMADURA_NO_MOTOR: ReadonlySet<string> = new Set([
  'reforco-de-ataque',
  'olho-critico',
  'exploracao-de-fraqueza',
  'quebra-parte',
  'agitador',
  'desempenho-maximo',
  'heroismo',
  'indignacao',
  'poder-maximo',
]);

/** Dano % somado ao golpe de quem tem as habilidades. */
export function bonusDanoDeArmadura(h: HabilidadesArmaduraAtivas | undefined, e: EstadoGolpeArmadura): number {
  if (!h) return 0;
  let total = 0;
  const nv = (id: string) => h[id] ?? 0;
  if (nv('reforco-de-ataque') > 0) total += por([1, 2, 3, 4, 5, 6, 7], nv('reforco-de-ataque'));
  if (e.alvoEnfurecido) {
    if (nv('quebra-parte') > 0) total += por([5, 10, 15], nv('quebra-parte'));
    if (nv('agitador') > 0) total += por([2, 3, 5, 6, 8, 10, 11], nv('agitador'));
  }
  // Desempenho Máximo: com o HP acima de 90%
  if (nv('desempenho-maximo') > 0 && e.hpMaxAtacante > 0 && e.hpAtacante * 100 > e.hpMaxAtacante * 90) {
    total += por([2, 4, 8], nv('desempenho-maximo'));
  }
  if (nv('heroismo') > 0 && abaixo(e.hpAtacante, e.hpMaxAtacante, 35)) total += por([0, 3, 3, 6, 9, 15, 24], nv('heroismo'));
  if (nv('indignacao') > 0 && abaixo(e.hpAtacante, e.hpMaxAtacante, 60)) total += por([2, 4, 6, 8, 10], nv('indignacao'));
  return total;
}

/** Pontos percentuais somados à chance de crítico do golpe. */
export function bonusCriticoDeArmadura(h: HabilidadesArmaduraAtivas | undefined, e: EstadoGolpeArmadura, contraFraqueza: boolean): number {
  if (!h) return 0;
  let total = 0;
  const nv = (id: string) => h[id] ?? 0;
  if (nv('reforco-de-ataque') >= 4) total += 3;
  if (nv('olho-critico') > 0) total += por([3, 6, 9, 12, 15, 18, 24], nv('olho-critico'));
  if (e.alvoEnfurecido && nv('agitador') > 0) total += por([3, 3, 4, 4, 6, 9, 12], nv('agitador'));
  if (contraFraqueza && nv('exploracao-de-fraqueza') > 0) {
    const n = nv('exploracao-de-fraqueza');
    total += por([6, 9, 18], n);
    if (abaixo(e.hpAlvo, e.hpMaxAlvo, 50)) total += por([3, 9, 12], n);
  }
  // Poder Máximo: com o HP cheio; no nível 5, até sofrer o primeiro golpe (HP e Sobreescudo cheios)
  const pm = nv('poder-maximo');
  if (pm > 0 && e.hpAtacante >= e.hpMaxAtacante) {
    if (pm < 5) total += por([6, 12, 18, 24], pm);
    else if (e.sobreescudoAtacante >= e.sobreescudoMaxAtacante) total += 24;
  }
  return total;
}

/** % de mitigação somado à de quem se defende (Heroísmo: com o HP abaixo de 35%). */
export function bonusMitigacaoDeArmadura(h: HabilidadesArmaduraAtivas | undefined, hp: number, hpMax: number): number {
  const nivel = h?.heroismo ?? 0;
  return nivel > 0 && abaixo(hp, hpMax, 35) ? por([10, 10, 20, 20, 20, 30, 30], nivel) : 0;
}
