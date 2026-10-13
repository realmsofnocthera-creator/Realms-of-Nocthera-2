import { BONUS_ELEMENTO_ARMA_PERCENTUAL } from '@/rules/armas';
import type { Elemento } from '@/rules/elements';
import { EFEITOS_STATUS, EfeitoStatus } from '@/rules/statusEffects';

/**
 * Habilidades de armadura que dependem do estado da luta (partes 2 e 3): dano e crítico condicionais, a mitigação do
 * Heroísmo, o dano elemental e os status de ataque. O motor não conhece peças: recebe só o nível já somado de cada habilidade (a ficha do equipamento) e
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
  'ataque-de-fogo',
  'ataque-de-agua',
  'ataque-de-gelo',
  'ataque-de-raio',
  'ataque-de-dragao',
  'ataque-de-veneno',
  'ataque-de-paralisia',
  'ataque-de-sono',
  'ataque-de-explosao',
  'atordoante',
  'adicao-de-veneno',
  'adicao-de-paralisia',
  'adicao-de-sono',
  'adicao-de-explosao',
  'bombardeiro',
  'artilharia-pesada',
  'coalescencia',
  'poder-de-diablos',
  'tormenta-de-reydras',
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
  if (nv('coalescencia') > 0 && abaixo(e.hpAtacante, e.hpMaxAtacante, 50)) total += por([5, 6, 7], nv('coalescencia'));
  // Poder de Diablos (nível 3): com o Sobreescudo zerado
  if (nv('poder-de-diablos') >= 3 && e.sobreescudoAtacante <= 0) total += 8;
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
  if (nv('tormenta-de-reydras') > 0) total += por([0, 3, 6], nv('tormenta-de-reydras'));
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

const ELEMENTO_DO_ATAQUE: Readonly<Record<string, Elemento>> = {
  'ataque-de-fogo': 'fogo',
  'ataque-de-agua': 'vento',
  'ataque-de-gelo': 'gelo',
  'ataque-de-raio': 'relampago',
  'ataque-de-dragao': 'sombrio',
};

/**
 * Dano % somado ao golpe que tem elemento: o +10% da arma elemental (no elemento dela) e as habilidades de dano
 * elemental (Ataque de Fogo, Água/Vento, Gelo, Raio e Dragão/Sombrio; Artilharia Pesada no Fogo; Tormenta de Reydras
 * no Relâmpago; Coalescência com o HP abaixo de 50%, em qualquer elemento).
 */
export function bonusDanoElementalDeArmadura(
  h: HabilidadesArmaduraAtivas | undefined,
  elementosArma: readonly Elemento[] | undefined,
  elemento: Elemento | undefined,
  e: EstadoGolpeArmadura
): number {
  if (!elemento) return 0;
  let total = elementosArma?.includes(elemento) ? BONUS_ELEMENTO_ARMA_PERCENTUAL : 0;
  if (!h) return total;
  for (const [id, el] of Object.entries(ELEMENTO_DO_ATAQUE)) {
    if (el === elemento && (h[id] ?? 0) > 0) total += por([3, 6, 10, 13, 16, 20], h[id]);
  }
  if (elemento === 'fogo' && (h['artilharia-pesada'] ?? 0) > 0) total += por([25, 50], h['artilharia-pesada']);
  if (elemento === 'relampago' && (h['tormenta-de-reydras'] ?? 0) > 0) total += por([5, 10, 15], h['tormenta-de-reydras']);
  if ((h['coalescencia'] ?? 0) > 0 && abaixo(e.hpAtacante, e.hpMaxAtacante, 50)) total += por([6, 12, 18], h['coalescencia']);
  return total;
}

/**
 * Bônus RELATIVO (%) na chance de aplicar o status: a chance base do status vezes (1 + bônus). Ataque de Veneno,
 * Paralisia, Sono e Explosão (Queimadura), Atordoante (Loucura), Tormenta de Reydras (Paralisia), Poder de Diablos
 * nível 3 (Loucura, com o Sobreescudo zerado) e Coalescência (todos, com o HP abaixo de 50%).
 */
export function bonusChanceStatusRelativa(h: HabilidadesArmaduraAtivas | undefined, status: EfeitoStatus, e: EstadoGolpeArmadura): number {
  if (!h) return 0;
  let total = 0;
  const tabela = [10, 20, 40, 60];
  if (status === 'veneno' && (h['ataque-de-veneno'] ?? 0) > 0) total += por(tabela, h['ataque-de-veneno']);
  if (status === 'paralisia' && (h['ataque-de-paralisia'] ?? 0) > 0) total += por(tabela, h['ataque-de-paralisia']);
  if (status === 'sono' && (h['ataque-de-sono'] ?? 0) > 0) total += por(tabela, h['ataque-de-sono']);
  if (status === 'queimadura' && (h['ataque-de-explosao'] ?? 0) > 0) total += por(tabela, h['ataque-de-explosao']);
  if (status === 'loucura') {
    if ((h['atordoante'] ?? 0) > 0) total += por([20, 30, 40, 50, 60], h['atordoante']);
    if ((h['poder-de-diablos'] ?? 0) >= 3 && e.sobreescudoAtacante <= 0) total += 10;
  }
  if (status === 'paralisia' && (h['tormenta-de-reydras'] ?? 0) > 0) total += por([10, 20, 30], h['tormenta-de-reydras']);
  if ((h['coalescencia'] ?? 0) > 0 && abaixo(e.hpAtacante, e.hpMaxAtacante, 50)) total += por([10, 20, 30], h['coalescencia']);
  return total;
}

/** Pontos de chance a somar à chance base do status, a partir do bônus relativo (base 8% e +20% = +1,6 pontos). */
export function chanceExtraRelativaEmPontos(status: EfeitoStatus, bonusRelativoPercentual: number): number {
  const base = EFEITOS_STATUS[status]?.chanceAtivacao ?? 0;
  return (base * bonusRelativoPercentual) / 100;
}

const ADICAO: readonly { id: string; status: EfeitoStatus; chancePercentual: number }[] = [
  { id: 'adicao-de-veneno', status: 'veneno', chancePercentual: 3 },
  { id: 'adicao-de-paralisia', status: 'paralisia', chancePercentual: 2 },
  { id: 'adicao-de-sono', status: 'sono', chancePercentual: 2 },
  { id: 'adicao-de-explosao', status: 'queimadura', chancePercentual: 4 },
];

/** Adição de Veneno, Paralisia, Sono e Explosão: chance fixa por golpe, só se a arma não aplicar aquele status. */
export function adicoesDeStatus(h: HabilidadesArmaduraAtivas | undefined, statusDaArma: readonly EfeitoStatus[]): { status: EfeitoStatus; chancePercentual: number }[] {
  if (!h) return [];
  return ADICAO.filter((a) => (h[a.id] ?? 0) > 0 && !statusDaArma.includes(a.status)).map((a) => ({ status: a.status, chancePercentual: a.chancePercentual }));
}

/** Dano da Queimadura aplicada por quem tem a armadura: Bombardeiro (+10% a +50%) e Artilharia Pesada (+25% e +50%). */
export function bonusDanoQueimaduraDeArmadura(h: HabilidadesArmaduraAtivas | undefined): number {
  if (!h) return 0;
  return ((h['bombardeiro'] ?? 0) > 0 ? por([10, 20, 30, 40, 50], h['bombardeiro']) : 0) + ((h['artilharia-pesada'] ?? 0) > 0 ? por([25, 50], h['artilharia-pesada']) : 0);
}
