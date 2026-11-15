/** Lógica do livro da Caçada (sem React): as páginas da esquerda, o zigue-zague e o que cada fita pede. */

/** Quantos monstros cabem em cada página da esquerda (nem poluído, nem vazio). */
export const MONSTROS_POR_PAGINA = 3;

/**
 * Reparte uma lista em páginas de, no máximo, `porPagina` itens, deixando as páginas com quantidades parecidas (4 monstros
 * viram 2 + 2, não 3 + 1) para nenhuma página ficar vazia demais. Sempre há ao menos uma página, mesmo vazia.
 */
export function paginasDeMonstros<T>(lista: readonly T[], porPagina: number = MONSTROS_POR_PAGINA): T[][] {
  const quantas = Math.max(1, Math.ceil(lista.length / porPagina));
  const base = Math.floor(lista.length / quantas);
  const sobra = lista.length % quantas;
  const paginas: T[][] = [];
  let inicio = 0;
  for (let i = 0; i < quantas; i++) {
    const tamanho = base + (i < sobra ? 1 : 0);
    paginas.push(lista.slice(inicio, inicio + tamanho));
    inicio += tamanho;
  }
  return paginas;
}

/** O lado de cada monstro na página: um na esquerda, o seguinte na direita, e assim vai (como uma colagem). */
export function ladoNaPagina(indice: number): 'esq' | 'dir' {
  return indice % 2 === 0 ? 'esq' : 'dir';
}

/** A posição (0 a 4) da fita de uma estrela: o ranque Baixo usa as fitas de 1★ a 5★ e o Alto, as de 6★ a 9★. */
export function fitaDaEstrela(estrela: number): number {
  return estrela <= 5 ? estrela - 1 : estrela - 6;
}
