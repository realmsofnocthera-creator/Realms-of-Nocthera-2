/**
 * O Bestiário: cada vitória contra uma criatura rende 1 XP de bestiário daquela criatura, de nível 0 (nunca derrotada) a 4.
 * Cada nível desbloqueia mais da ficha dela:
 *   nível 1: metade dos drops · nível 2: o restante dos drops · nível 3: as resistências · nível 4: as fraquezas.
 * O XP fica no personagem (`bestiario`, por id de monstro) e sobe na mesma gravação da vitória: nenhuma gravação nova.
 */

export const NIVEL_MAXIMO_DO_BESTIARIO = 4;

/** XP (vitórias) para chegar a cada nível, do 1 ao 4. (proposta, a confirmar) */
export const XP_PARA_NIVEL_DO_BESTIARIO: readonly [number, number, number, number] = [1, 3, 6, 10];

/** O teto do XP guardado por criatura (mais que isso não muda nada). */
export const XP_MAXIMO_DO_BESTIARIO = XP_PARA_NIVEL_DO_BESTIARIO[NIVEL_MAXIMO_DO_BESTIARIO - 1];

export type BestiarioDoJogador = Readonly<Record<string, number>>;

export const MAXIMO_DE_CRIATURAS_NO_BESTIARIO = 1000;

/** O nível (0 a 4) de um XP de bestiário. */
export function nivelDoBestiario(xp: number): number {
  let nivel = 0;
  for (const exigido of XP_PARA_NIVEL_DO_BESTIARIO) if (xp >= exigido) nivel += 1;
  return nivel;
}

/**
 * O XP de bestiário de uma criatura: o gravado e, para quem já tinha derrotado a criatura antes do Bestiário existir
 * (a lista `monstrosDerrotados` das Conquistas), pelo menos o necessário para o nível 1.
 */
export function xpDoBestiario(char: { bestiario?: BestiarioDoJogador; monstrosDerrotados?: readonly string[] }, monstroId: string): number {
  const gravado = char.bestiario?.[monstroId] ?? 0;
  const antigo = char.monstrosDerrotados?.includes(monstroId) ? XP_PARA_NIVEL_DO_BESTIARIO[0] : 0;
  return Math.max(gravado, antigo);
}

export function nivelDaCriatura(char: { bestiario?: BestiarioDoJogador; monstrosDerrotados?: readonly string[] }, monstroId: string): number {
  return nivelDoBestiario(xpDoBestiario(char, monstroId));
}

/** O que a ficha mostra em cada nível do Bestiário. */
export interface FichaDesbloqueada {
  /** Quantos drops aparecem (os primeiros da lista). */
  drops: number;
  resistencias: boolean;
  fraquezas: boolean;
}

export function fichaDesbloqueada(nivel: number, totalDeDrops: number): FichaDesbloqueada {
  return {
    drops: nivel >= 2 ? totalDeDrops : nivel >= 1 ? Math.ceil(totalDeDrops / 2) : 0,
    resistencias: nivel >= 3,
    fraquezas: nivel >= 4,
  };
}

/** Soma uma vitória por id na tabela (devolve uma tabela nova; o XP para no teto). Sem ids, devolve a mesma tabela. */
export function somarVitoriasNoBestiario(atual: BestiarioDoJogador | undefined, ids: readonly string[]): BestiarioDoJogador | undefined {
  if (!ids.length) return atual;
  const nova: Record<string, number> = { ...(atual ?? {}) };
  for (const id of ids) nova[id] = Math.min(XP_MAXIMO_DO_BESTIARIO, (nova[id] ?? 0) + 1);
  return nova;
}

/** Lê do banco: só ids curtos com XP inteiro de 1 até o teto, no máximo 1000 criaturas. */
export function bestiarioDoDocumento(bruto: unknown): Record<string, number> | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: Record<string, number> = {};
  for (const [id, xp] of Object.entries(bruto as Record<string, unknown>).slice(0, MAXIMO_DE_CRIATURAS_NO_BESTIARIO)) {
    if (id.length > 0 && id.length <= 80 && typeof xp === 'number' && Number.isFinite(xp) && xp >= 1) saida[id] = Math.min(XP_MAXIMO_DO_BESTIARIO, Math.floor(xp));
  }
  return Object.keys(saida).length ? saida : undefined;
}
