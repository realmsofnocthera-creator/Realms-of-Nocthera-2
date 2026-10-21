import { BORDA_BAIXO, BORDA_CIMA, BORDA_DIREITA, BORDA_ESQUERDA, type RegraDeBorda } from '@/rules/tileset';
import { tileDoValor, valorDoTile, type CamadaDoMapa, type MapaDados } from '@/rules/mapa';
import { dentro, type Mudanca, type Ponto } from '@/lib/editorMapa';

/**
 * Borda automática (auto-tile) do editor de mapas, sem React. A regra de um terreno (ver `RegraDeBorda`) diz qual dos
 * 16 tiles usar conforme os vizinhos do mesmo terreno. O mapa guarda só números de tile comuns: o formato não muda e
 * quem abre o mapa sem saber de regras desenha igual. Fora do mapa conta como "mesmo terreno", para a borda do mapa
 * não parecer uma beirada.
 */

/** As regras de cada tileset do mapa, na ordem de `mapa.tilesets` (undefined: o tileset não tem regras). */
export type RegrasDoMapa = (readonly RegraDeBorda[] | undefined)[];

export interface RegraNoMapa {
  regra: RegraDeBorda;
  /** Posição do tileset na lista do mapa. */
  tileset: number;
}

/** A regra a que o tile (valor da camada) pertence, ou null. */
export function regraDoValor(regras: RegrasDoMapa, valor: number): RegraNoMapa | null {
  const t = tileDoValor(valor);
  if (!t) return null;
  const regra = regras[t.tileset]?.find((r) => r.tiles.includes(t.tile));
  return regra ? { regra, tileset: t.tileset } : null;
}

function pertence(alvo: RegraNoMapa, valor: number): boolean {
  const t = tileDoValor(valor);
  return t !== null && t.tileset === alvo.tileset && alvo.regra.tiles.includes(t.tile);
}

/** A combinação de vizinhos do mesmo terreno em (x, y), de 0 a 15. */
export function mascaraDaCelula(mapa: MapaDados, camada: CamadaDoMapa, x: number, y: number, alvo: RegraNoMapa): number {
  const lista = mapa.camadas[camada];
  const igual = (px: number, py: number) => !dentro(mapa, { x: px, y: py }) || pertence(alvo, lista[py * mapa.largura + px]);
  return (igual(x, y - 1) ? BORDA_CIMA : 0) | (igual(x + 1, y) ? BORDA_DIREITA : 0) | (igual(x, y + 1) ? BORDA_BAIXO : 0) | (igual(x - 1, y) ? BORDA_ESQUERDA : 0);
}

const VIZINHOS = [
  [0, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Recalcula o tile de cada célula do terreno em `celulas` e nos vizinhos, e devolve só o que mudou. */
function recalcular(mapa: MapaDados, camada: CamadaDoMapa, celulas: Ponto[], regras: RegrasDoMapa, antesPorIndice: Map<number, number>): void {
  const lista = mapa.camadas[camada];
  const vistos = new Set<number>();
  for (const c of celulas) {
    for (const [dx, dy] of VIZINHOS) {
      const p = { x: c.x + dx, y: c.y + dy };
      if (!dentro(mapa, p)) continue;
      const i = p.y * mapa.largura + p.x;
      if (vistos.has(i)) continue;
      vistos.add(i);
      const alvo = regraDoValor(regras, lista[i]);
      if (!alvo) continue;
      const novo = valorDoTile(alvo.tileset, alvo.regra.tiles[mascaraDaCelula(mapa, camada, p.x, p.y, alvo)]);
      if (novo !== lista[i]) {
        if (!antesPorIndice.has(i)) antesPorIndice.set(i, lista[i]);
        lista[i] = novo;
      }
    }
  }
}

function mudancasDe(mapa: MapaDados, camada: CamadaDoMapa, antesPorIndice: Map<number, number>): Mudanca[] {
  const lista = mapa.camadas[camada];
  return [...antesPorIndice.entries()].filter(([i, antes]) => lista[i] !== antes).map(([i, antes]) => [i, antes, lista[i]] as Mudanca);
}

/**
 * Pinta o terreno da regra nas células e acerta as bordas delas e dos vizinhos do mesmo terreno.
 * Muda a camada e devolve o que mudou (para o desfazer).
 */
export function pintarComBorda(mapa: MapaDados, camada: CamadaDoMapa, celulas: Ponto[], alvo: RegraNoMapa, regras: RegrasDoMapa): Mudanca[] {
  const lista = mapa.camadas[camada];
  const antes = new Map<number, number>();
  const dentroDoMapa = celulas.filter((c) => dentro(mapa, c));
  const miolo = valorDoTile(alvo.tileset, alvo.regra.tiles[15]);
  for (const c of dentroDoMapa) {
    const i = c.y * mapa.largura + c.x;
    if (!antes.has(i)) antes.set(i, lista[i]);
    lista[i] = miolo;
  }
  recalcular(mapa, camada, dentroDoMapa, regras, antes);
  return mudancasDe(mapa, camada, antes);
}

/** Apaga as células e acerta as bordas dos vizinhos que são de algum terreno com regra. */
export function apagarComBorda(mapa: MapaDados, camada: CamadaDoMapa, celulas: Ponto[], regras: RegrasDoMapa): Mudanca[] {
  const lista = mapa.camadas[camada];
  const antes = new Map<number, number>();
  const dentroDoMapa = celulas.filter((c) => dentro(mapa, c));
  for (const c of dentroDoMapa) {
    const i = c.y * mapa.largura + c.x;
    if (!antes.has(i)) antes.set(i, lista[i]);
    lista[i] = 0;
  }
  recalcular(mapa, camada, dentroDoMapa, regras, antes);
  return mudancasDe(mapa, camada, antes);
}

/** Descrição curta de uma posição da regra, para a tela de montagem ("Sozinho", "Liga: cima e direita"...). */
export function nomeDaPosicao(mascara: number): string {
  if (mascara === 0) return 'Sozinho';
  if (mascara === 15) return 'Miolo';
  const lados = [mascara & BORDA_CIMA ? 'cima' : '', mascara & BORDA_DIREITA ? 'direita' : '', mascara & BORDA_BAIXO ? 'baixo' : '', mascara & BORDA_ESQUERDA ? 'esquerda' : ''].filter(Boolean);
  return `Liga: ${lados.join(', ')}`;
}
