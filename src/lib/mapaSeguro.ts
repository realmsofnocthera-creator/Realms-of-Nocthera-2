/**
 * Mapas de catálogo sem protótipo (P0 de segurança): um mapa comum (`{}`) responde a `mapa["constructor"]`, `mapa["__proto__"]` e `"toString" in mapa`
 * com o que vem do protótipo, então um id vindo do jogador passava como se existisse (anunciar "999999× constructor" no Mercado, doar `constructor`
 * na Pesquisa da guilda). Estes mapas não têm protótipo e `temId` só aceita chave que o catálogo tem de verdade. Não são congelados: o catálogo
 * publicado pelo Painel (`catalogoAoVivo`) troca os itens no lugar.
 */

/** Um mapa sem protótipo, no lugar de `Object.fromEntries(...)`, para catálogos indexados por id. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapaDeEntradas(entradas: Iterable<readonly any[]>): any {
  const m = Object.create(null) as Record<string, unknown>;
  for (const [k, v] of entradas as Iterable<[PropertyKey, unknown]>) Object.defineProperty(m, k, { value: v, enumerable: true, writable: true, configurable: true });
  return m;
}

/** Um mapa por id a partir de uma lista de itens com `id`. */
export function mapaPorId<T extends { id: string }>(itens: readonly T[]): Readonly<Record<string, T>> {
  return mapaDeEntradas(itens.map((i) => [i.id, i] as const));
}

/** A chave é um texto e existe no mapa (própria, nunca herdada: "constructor", "__proto__", "toString"...). */
export function temId<T extends object>(mapa: T, id: unknown): id is Extract<keyof T, string> {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(mapa, id);
}

/** O item do catálogo, ou undefined se o id não for uma chave do mapa. */
export function buscarNoMapa<V>(mapa: Readonly<Record<string, V>>, id: unknown): V | undefined {
  return temId(mapa, id) ? mapa[id] : undefined;
}
