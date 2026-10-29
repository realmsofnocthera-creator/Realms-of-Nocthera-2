import type { Elemento } from '@/rules/elements';

/**
 * Ícones dos 7 elementos, em dois estilos (pixel art, fundo transparente):
 * - detalhado (160×160): para telas grandes, como a escolha da linhagem do Draconiano e os textos explicativos;
 * - simples (96×96): para o combate, as armas, a ficha e listas, onde o ícone aparece pequeno.
 */
const PASTA = '/icons/elementos/';

export type VarianteDoIconeDeElemento = 'simples' | 'detalhado';

export const NOMES_DOS_ELEMENTOS: Readonly<Record<Elemento, string>> = {
  fogo: 'Fogo',
  gelo: 'Gelo',
  relampago: 'Relâmpago',
  terra: 'Terra',
  vento: 'Vento',
  sagrado: 'Sagrado',
  sombrio: 'Sombrio',
};

export function iconeDeElemento(elemento: Elemento, variante: VarianteDoIconeDeElemento = 'simples'): string {
  return `${PASTA}${variante}-${elemento}.webp`;
}

/** "Relâmpago", "relampago" e "RELÂMPAGO" viram 'relampago'; texto que não é elemento vira null. */
export function elementoDoTexto(texto: string): Elemento | null {
  const limpo = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  return (Object.keys(NOMES_DOS_ELEMENTOS) as Elemento[]).find((e) => e === limpo) ?? null;
}
