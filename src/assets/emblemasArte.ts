import { TIPOS_EMBLEMA } from '@/rules/emblemasCatalogo';

/**
 * A arte dos 25 emblemas (pixel art do Yuri, sem fundo, o medalhão com a moldura da raridade; as estrelas são desenhadas pela
 * interface). Dois tamanhos parados: 32 (cabe no espaço da ficha) e 64 (inventário, loja). Os 5 Míticos têm também uma versão
 * animada por estrela (de 1 a 4), cada vez mais intensa. Gerados por `scripts/emblemas/converter.py`.
 */
export type TamanhoDoEmblema = 32 | 64;

const PASTA = '/images/emblemas';

export function iconeDoEmblema(tipoId: string, tamanho: TamanhoDoEmblema = 64): string {
  return `${PASTA}/${tipoId}-${tamanho}.webp`;
}

/** Os Míticos, que ganham animação. */
export const EMBLEMAS_ANIMADOS: ReadonlySet<string> = new Set(TIPOS_EMBLEMA.filter((t) => t.raridade === 'mitico').map((t) => t.id));

/** A versão animada do emblema para a estrela dele (1 a 4); undefined nos que não são Míticos. */
export function iconeAnimadoDoEmblema(tipoId: string, estrelas: number): string | undefined {
  if (!EMBLEMAS_ANIMADOS.has(tipoId)) return undefined;
  const e = Math.min(4, Math.max(1, Math.round(estrelas)));
  return `${PASTA}/animados/${tipoId}-${e}estrela-64.webp`;
}
