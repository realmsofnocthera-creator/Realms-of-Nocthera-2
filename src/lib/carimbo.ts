import { CAMADAS_DO_MAPA, type CamadaDoMapa, type MapaDados } from '@/rules/mapa';
import { dentro, type LoteDeCamada, type Mudanca, type Ponto } from '@/lib/editorMapa';

/**
 * Pincel maior, formas e carimbo do editor de mapas, sem React. O carimbo é um pedaço copiado do mapa (as quatro
 * camadas) que se cola em outro lugar: tile vazio no carimbo não apaga o que já está no mapa, e na colisão só os
 * bloqueios (1) são colados.
 */

export const TAMANHOS_DO_PINCEL = [1, 2, 3, 5] as const;
export type TamanhoDoPincel = (typeof TAMANHOS_DO_PINCEL)[number];

export interface Retangulo {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Os quatro cantos viram um retângulo (a e b podem vir em qualquer ordem). */
export function retanguloEntre(a: Ponto, b: Ponto): Retangulo {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, largura: Math.abs(a.x - b.x) + 1, altura: Math.abs(a.y - b.y) + 1 };
}

export function pontosDoRetangulo(r: Retangulo): Ponto[] {
  const pontos: Ponto[] = [];
  for (let y = r.y; y < r.y + r.altura; y++) for (let x = r.x; x < r.x + r.largura; x++) pontos.push({ x, y });
  return pontos;
}

/**
 * Cada ponto vira um quadrado de `tamanho` × `tamanho` centrado nele (nos tamanhos pares, a sobra vai para a direita e
 * para baixo). Sem repetir células.
 */
export function expandirPincel(pontos: readonly Ponto[], tamanho: number): Ponto[] {
  if (tamanho <= 1) return [...pontos];
  const antes = Math.floor((tamanho - 1) / 2);
  const vistos = new Set<string>();
  const saida: Ponto[] = [];
  for (const p of pontos) {
    for (let dy = -antes; dy < tamanho - antes; dy++) {
      for (let dx = -antes; dx < tamanho - antes; dx++) {
        const q = { x: p.x + dx, y: p.y + dy };
        const chave = `${q.x},${q.y}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        saida.push(q);
      }
    }
  }
  return saida;
}

export interface Carimbo {
  largura: number;
  altura: number;
  camadas: Record<CamadaDoMapa, number[]>;
}

/** Copia a área (cortada pelas bordas do mapa) com as quatro camadas; null se a área não tem nenhuma célula do mapa. */
export function copiarArea(mapa: MapaDados, r: Retangulo): Carimbo | null {
  const x0 = Math.max(0, r.x);
  const y0 = Math.max(0, r.y);
  const x1 = Math.min(mapa.largura, r.x + r.largura);
  const y1 = Math.min(mapa.altura, r.y + r.altura);
  if (x1 <= x0 || y1 <= y0) return null;
  const largura = x1 - x0;
  const altura = y1 - y0;
  const camadas = { chao: [] as number[], objetos: [] as number[], acima: [] as number[], colisao: [] as number[] };
  for (const c of CAMADAS_DO_MAPA) {
    const origem = mapa.camadas[c] ?? [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) camadas[c].push(origem[y * mapa.largura + x] ?? 0);
  }
  return { largura, altura, camadas };
}

function transformar(c: Carimbo, novaLargura: number, novaAltura: number, origemDe: (x: number, y: number) => number): Carimbo {
  const camadas = { chao: [] as number[], objetos: [] as number[], acima: [] as number[], colisao: [] as number[] };
  for (const nome of CAMADAS_DO_MAPA) {
    for (let y = 0; y < novaAltura; y++) for (let x = 0; x < novaLargura; x++) camadas[nome].push(c.camadas[nome][origemDe(x, y)]);
  }
  return { largura: novaLargura, altura: novaAltura, camadas };
}

/** Espelha da esquerda para a direita. */
export function espelharCarimbo(c: Carimbo): Carimbo {
  return transformar(c, c.largura, c.altura, (x, y) => y * c.largura + (c.largura - 1 - x));
}

/** Gira 90° no sentido horário. */
export function girarCarimbo(c: Carimbo): Carimbo {
  // o novo carimbo tem a largura = altura antiga; a célula (x, y) vem de (y, altura-1-x)... no sentido horário
  return transformar(c, c.altura, c.largura, (x, y) => (c.altura - 1 - x) * c.largura + y);
}

/** Onde fica o canto de cima à esquerda do carimbo quando se toca em `centro`: o toque fica no meio dele. */
export function origemDoCarimbo(c: Pick<Carimbo, 'largura' | 'altura'>, centro: Ponto): Ponto {
  return { x: centro.x - Math.floor(c.largura / 2), y: centro.y - Math.floor(c.altura / 2) };
}

/** Cola o carimbo com o canto de cima à esquerda em `origem`. Muda o mapa e devolve um lote por camada que mudou. */
export function carimbar(mapa: MapaDados, c: Carimbo, origem: Ponto): LoteDeCamada[] {
  const lotes: LoteDeCamada[] = [];
  for (const camada of CAMADAS_DO_MAPA) {
    const lista = mapa.camadas[camada];
    const mudancas: Mudanca[] = [];
    for (let cy = 0; cy < c.altura; cy++) {
      for (let cx = 0; cx < c.largura; cx++) {
        const valor = c.camadas[camada][cy * c.largura + cx];
        if (!valor) continue; // vazio não apaga
        const p = { x: origem.x + cx, y: origem.y + cy };
        if (!dentro(mapa, p)) continue;
        const i = p.y * mapa.largura + p.x;
        if (lista[i] === valor) continue;
        mudancas.push([i, lista[i], valor]);
        lista[i] = valor;
      }
    }
    if (mudancas.length) lotes.push({ camada, mudancas });
  }
  return lotes;
}

/** O retângulo que o carimbo cobre quando colado em `origem` (para a prévia). */
export function areaDoCarimbo(c: Pick<Carimbo, 'largura' | 'altura'>, origem: Ponto): Retangulo {
  return { x: origem.x, y: origem.y, largura: c.largura, altura: c.altura };
}
