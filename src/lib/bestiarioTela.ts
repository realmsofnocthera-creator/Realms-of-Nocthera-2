import { todosOsMonstros, type MonstroTela } from '@/lib/cacadaTela';
import { paginasDeMonstros } from '@/lib/cacadaLivro';

/** Quantas criaturas cabem em cada página da esquerda do Bestiário (2 colunas por 3 linhas). */
export const CRIATURAS_POR_PAGINA = 6;

export interface CategoriaDoBestiario {
  /** O nome da categoria (Fera, Morto-vivo, Wyvern...). */
  nome: string;
  monstros: MonstroTela[];
}

export interface PaginaDoBestiario {
  categoria: string;
  monstros: MonstroTela[];
}

/** As categorias de monstros, na ordem em que aparecem (da mais fácil para a mais difícil), com todas as criaturas de cada uma. */
export function categoriasDoBestiario(): CategoriaDoBestiario[] {
  const porNome = new Map<string, MonstroTela[]>();
  for (const m of todosOsMonstros()) {
    const lista = porNome.get(m.categoria) ?? [];
    lista.push(m);
    porNome.set(m.categoria, lista);
  }
  return [...porNome.entries()].map(([nome, monstros]) => ({ nome, monstros }));
}

/** As páginas do livro (a da esquerda de cada abertura): cada categoria vira uma ou mais páginas, uma depois da outra. */
export function paginasDoBestiario(): PaginaDoBestiario[] {
  return categoriasDoBestiario().flatMap((c) => paginasDeMonstros(c.monstros, CRIATURAS_POR_PAGINA).map((monstros) => ({ categoria: c.nome, monstros })));
}

/** A posição da primeira página de uma categoria. */
export function primeiraPaginaDaCategoria(paginas: readonly PaginaDoBestiario[], categoria: string): number {
  return Math.max(0, paginas.findIndex((p) => p.categoria === categoria));
}
