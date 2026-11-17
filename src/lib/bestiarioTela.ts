import { todosOsMonstros, type MonstroTela } from '@/lib/cacadaTela';
import { paginasDeMonstros } from '@/lib/cacadaLivro';
import { CLASSIFICACOES_DE_MONSTRO } from '@/rules/maestrias';
import { CLASSIFICACAO_DO_MONSTRO } from '@/rules/classificacaoDosMonstros';

/** Quantas criaturas cabem em cada página da esquerda do Bestiário (2 colunas por 3 linhas). */
export const CRIATURAS_POR_PAGINA = 6;

export interface CategoriaDoBestiario {
  /** O id da classificação (necrofagos, feras, leviatas...), como nas trilhas de maestria (`monstro:<id>`). */
  id: string;
  /** O nome da classificação (Necrófagos, Feras, Leviatãs...). */
  nome: string;
  monstros: MonstroTela[];
}

export interface PaginaDoBestiario {
  categoria: string;
  /** O id da classificação da página. */
  categoriaId: string;
  monstros: MonstroTela[];
}

/**
 * As classificações do bestiário (as 13 do Yuri, na ordem dele), cada uma com as suas criaturas, da mais fácil para a mais
 * difícil. As que ainda não têm criatura na Caçada não aparecem.
 */
export function categoriasDoBestiario(): CategoriaDoBestiario[] {
  const todos = todosOsMonstros();
  return CLASSIFICACOES_DE_MONSTRO.map((c) => ({ id: c.id, nome: c.nome, monstros: todos.filter((m) => CLASSIFICACAO_DO_MONSTRO[m.id] === c.id) })).filter((c) => c.monstros.length > 0);
}

/** As páginas do livro (a da esquerda de cada abertura): cada categoria vira uma ou mais páginas, uma depois da outra. */
export function paginasDoBestiario(): PaginaDoBestiario[] {
  return categoriasDoBestiario().flatMap((c) => paginasDeMonstros(c.monstros, CRIATURAS_POR_PAGINA).map((monstros) => ({ categoria: c.nome, categoriaId: c.id, monstros })));
}

/** A posição da primeira página de uma categoria. */
export function primeiraPaginaDaCategoria(paginas: readonly PaginaDoBestiario[], categoria: string): number {
  return Math.max(0, paginas.findIndex((p) => p.categoria === categoria));
}
