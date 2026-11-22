/**
 * Equilíbrio entre classes (Balanceamento 2.4, v1.0 PROVISÓRIO, "aceito como indicativo"): o ajuste do dano total de cada classe, em %, aplicado ao
 * dano de cada golpe do personagem antes da defesa. Não mexe em atributos. Papéis: Feiticeiro, Samurai e Bandido = dano; Bárbaro e Cavaleiro =
 * resistência; Profeta = sustentação. O Balanceamento vai refinar por habilidade (Especial e Ultimate) e por nível; quando isso vier, esta tabela
 * volta a 0 e os valores passam para os multiplicadores das habilidades.
 */
export const AJUSTE_DE_DANO_POR_CLASSE: Readonly<Record<string, number>> = {
  samurai: -23,
  cavaleiro: -9,
  feiticeiro: -5,
  bandido: -5,
  barbaro: 9,
  profeta: 35,
};

/** O fator (em %) do dano da classe: 100 = sem ajuste. Monstros (sem classe) e classes desconhecidas não mudam. */
export function fatorDeDanoDaClasse(classeId: string | undefined): number {
  const id = classeId?.trim().toLowerCase();
  const ajuste = id && Object.prototype.hasOwnProperty.call(AJUSTE_DE_DANO_POR_CLASSE, id) ? AJUSTE_DE_DANO_POR_CLASSE[id] : 0;
  return 100 + ajuste;
}
