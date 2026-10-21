import type { CamadaDoMapa, MapaDados } from '@/rules/mapa';
import type { ObjetoDoMapa } from '@/rules/objetosDoMapa';

/**
 * Lógica do editor de mapas 2D (3.5.6.2), sem React: pintar, apagar, preencher e o histórico de desfazer e refazer.
 * Tudo trabalha sobre as camadas do mapa (listas de largura × altura posições) e devolve as mudanças feitas,
 * que o histórico guarda para desfazer.
 */

export type Ferramenta = 'pincel' | 'borracha' | 'balde' | 'conta-gotas' | 'mover' | 'retangulo' | 'linha' | 'selecionar' | 'carimbo';

export interface Ponto {
  x: number;
  y: number;
}

/** Uma posição que mudou: índice na camada, valor antes e depois. */
export type Mudanca = [indice: number, antes: number, depois: number];

/** Mudança nos tiles de uma camada. */
export interface LoteDeCamada {
  camada: CamadaDoMapa;
  mudancas: Mudanca[];
}

/** Mudança nos objetos interativos: a lista inteira antes e depois (são poucos, no máximo 200). */
export interface LoteDeObjetos {
  objetos: { antes: ObjetoDoMapa[]; depois: ObjetoDoMapa[] };
  /** Edições seguidas do mesmo campo (digitar um texto) viram um só passo do desfazer. */
  grupo?: string;
}

/** Mudança em várias camadas de uma vez (o carimbo): desfazer e refazer tratam como um passo só. */
export interface LoteVarios {
  varios: LoteDeCamada[];
}

export type Lote = LoteDeCamada | LoteDeObjetos | LoteVarios;

function ehLoteDeObjetos(l: Lote): l is LoteDeObjetos {
  return 'objetos' in l;
}

function ehLoteVarios(l: Lote): l is LoteVarios {
  return 'varios' in l;
}

export interface Historico {
  desfazer: Lote[];
  refazer: Lote[];
}

export const LIMITE_DO_HISTORICO = 100;

export function historicoVazio(): Historico {
  return { desfazer: [], refazer: [] };
}

export function dentro(mapa: Pick<MapaDados, 'largura' | 'altura'>, p: Ponto): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < mapa.largura && p.y < mapa.altura;
}

/** Os pontos de uma linha reta entre a e b (Bresenham): o traço do dedo não fica com buracos. */
export function pontosDaLinha(a: Ponto, b: Ponto): Ponto[] {
  const pontos: Ponto[] = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let erro = dx + dy;
  for (;;) {
    pontos.push({ x, y });
    if (x === b.x && y === b.y) return pontos;
    const e2 = 2 * erro;
    if (e2 >= dy) {
      erro += dy;
      x += sx;
    }
    if (e2 <= dx) {
      erro += dx;
      y += sy;
    }
  }
}

/** Põe `valor` nos pontos (os de fora do mapa são ignorados). Muda a camada e devolve o que mudou. */
export function pintar(mapa: MapaDados, camada: CamadaDoMapa, pontos: Ponto[], valor: number): Mudanca[] {
  const lista = mapa.camadas[camada];
  const mudancas: Mudanca[] = [];
  for (const p of pontos) {
    if (!dentro(mapa, p)) continue;
    const i = p.y * mapa.largura + p.x;
    if (lista[i] === valor) continue;
    mudancas.push([i, lista[i], valor]);
    lista[i] = valor;
  }
  return mudancas;
}

/** Balde: troca por `valor` toda a área contínua (vizinhos de cima, baixo e lados) com o mesmo valor do ponto. */
export function preencher(mapa: MapaDados, camada: CamadaDoMapa, inicio: Ponto, valor: number): Mudanca[] {
  if (!dentro(mapa, inicio)) return [];
  const lista = mapa.camadas[camada];
  const { largura, altura } = mapa;
  const alvo = lista[inicio.y * largura + inicio.x];
  if (alvo === valor) return [];
  const mudancas: Mudanca[] = [];
  const pilha = [inicio.y * largura + inicio.x];
  while (pilha.length) {
    const i = pilha.pop()!;
    if (lista[i] !== alvo) continue;
    lista[i] = valor;
    mudancas.push([i, alvo, valor]);
    const x = i % largura;
    const y = (i - x) / largura;
    if (x > 0) pilha.push(i - 1);
    if (x < largura - 1) pilha.push(i + 1);
    if (y > 0) pilha.push(i - largura);
    if (y < altura - 1) pilha.push(i + largura);
  }
  return mudancas;
}

/** Junta as mudanças de um mesmo traço: a mesma posição fica com o primeiro "antes" e o último "depois". */
export function juntarMudancas(mudancas: Mudanca[]): Mudanca[] {
  const porIndice = new Map<number, Mudanca>();
  for (const [i, antes, depois] of mudancas) {
    const anterior = porIndice.get(i);
    porIndice.set(i, [i, anterior ? anterior[1] : antes, depois]);
  }
  return [...porIndice.values()].filter(([, antes, depois]) => antes !== depois);
}

/** Guarda um lote no histórico (uma ação nova apaga o que dava para refazer). */
export function registrar(h: Historico, lote: Lote): Historico {
  if (ehLoteVarios(lote) ? lote.varios.every((l) => l.mudancas.length === 0) : ehLoteDeObjetos(lote) ? JSON.stringify(lote.objetos.antes) === JSON.stringify(lote.objetos.depois) : lote.mudancas.length === 0) return h;
  const ultimo = h.desfazer[h.desfazer.length - 1];
  if (ultimo && ehLoteDeObjetos(lote) && lote.grupo && ehLoteDeObjetos(ultimo) && ultimo.grupo === lote.grupo) {
    const junto: LoteDeObjetos = { objetos: { antes: ultimo.objetos.antes, depois: lote.objetos.depois }, grupo: lote.grupo };
    return { desfazer: [...h.desfazer.slice(0, -1), junto], refazer: [] };
  }
  const desfazer = [...h.desfazer, lote];
  return { desfazer: desfazer.slice(-LIMITE_DO_HISTORICO), refazer: [] };
}

function aplicar(mapa: MapaDados, lote: Lote, sentido: 'antes' | 'depois') {
  if (ehLoteDeObjetos(lote)) {
    mapa.objetos = structuredClone(lote.objetos[sentido]);
    return;
  }
  if (ehLoteVarios(lote)) {
    for (const parte of lote.varios) aplicar(mapa, parte, sentido);
    return;
  }
  const lista = mapa.camadas[lote.camada];
  for (const [i, antes, depois] of lote.mudancas) lista[i] = sentido === 'antes' ? antes : depois;
}

/** Desfaz o último lote (muda o mapa). Devolve o histórico novo, ou o mesmo se não havia o que desfazer. */
export function desfazer(mapa: MapaDados, h: Historico): Historico {
  const lote = h.desfazer[h.desfazer.length - 1];
  if (!lote) return h;
  aplicar(mapa, lote, 'antes');
  return { desfazer: h.desfazer.slice(0, -1), refazer: [...h.refazer, lote] };
}

export function refazer(mapa: MapaDados, h: Historico): Historico {
  const lote = h.refazer[h.refazer.length - 1];
  if (!lote) return h;
  aplicar(mapa, lote, 'depois');
  return { desfazer: [...h.desfazer, lote], refazer: h.refazer.slice(0, -1) };
}

/** A célula do mapa sob um ponto da tela, dado o tamanho do tile já com o zoom. */
export function celulaDoPonto(px: number, py: number, ladoNaTela: number): Ponto {
  return { x: Math.floor(px / ladoNaTela), y: Math.floor(py / ladoNaTela) };
}

/** Uma cópia do mapa para editar sem mexer no original. */
export function copiarMapa(mapa: MapaDados): MapaDados {
  return {
    ...mapa,
    tilesets: [...mapa.tilesets],
    camadas: { chao: [...mapa.camadas.chao], objetos: [...mapa.camadas.objetos], acima: [...(mapa.camadas.acima ?? mapa.camadas.chao.map(() => 0))], colisao: [...mapa.camadas.colisao] },
    objetos: structuredClone(mapa.objetos ?? []),
  };
}

/** O valor que cada ferramenta grava na camada (a colisão só tem 0 e 1). */
export function valorDaFerramenta(ferramenta: Ferramenta, camada: CamadaDoMapa, tileEscolhido: number): number | null {
  if (ferramenta === 'borracha') return 0;
  if (ferramenta !== 'pincel' && ferramenta !== 'balde' && ferramenta !== 'retangulo' && ferramenta !== 'linha') return null;
  if (camada === 'colisao') return 1;
  return tileEscolhido > 0 ? tileEscolhido : null;
}
