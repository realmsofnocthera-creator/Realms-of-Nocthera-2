import { CAMADAS_DO_MAPA, LADO_ANTIGO_DO_MAPA, type CamadaDoMapa } from '@/rules/mapa';

/**
 * Armazenamento comprimido dos mapas grandes (3.5.6.7, etapa 1). Um documento do banco guarda no máximo 1 MiB, e as
 * camadas de um mapa grande em listas de números não cabem. Cada camada vira um texto com repetições agrupadas
 * (RLE) em base 36: "0.3a,f,f,2z.4" = 0 repetido 0x3a vezes, f, f, 2z repetido 4 vezes... (número sozinho vale uma
 * vez; "valor.vezes" repete). Só mapas com um lado acima de 128 são comprimidos: os demais ficam como sempre
 * foram, então voltar a uma versão antiga do jogo nunca deixa um mapa antigo ilegível. Quem lê o banco descomprime
 * antes de entregar o mapa, então o resto do jogo só conhece o formato com listas.
 */
export type CamadaComprimida = string;

const eTexto = (v: unknown): v is string => typeof v === 'string';

/** Agrupa repetições seguidas de uma camada. */
export function comprimirCamada(valores: readonly number[]): CamadaComprimida {
  const partes: string[] = [];
  let i = 0;
  while (i < valores.length) {
    const v = valores[i];
    let j = i + 1;
    while (j < valores.length && valores[j] === v) j++;
    const vezes = j - i;
    partes.push(vezes > 1 ? `${v.toString(36)}.${vezes.toString(36)}` : v.toString(36));
    i = j;
  }
  return partes.join(',');
}

/** O caminho inverso; null se o texto está corrompido ou não tem exatamente `total` posições. */
export function descomprimirCamada(texto: string, total: number): number[] | null {
  const saida: number[] = [];
  if (texto === '') return total === 0 ? saida : null;
  for (const parte of texto.split(',')) {
    const m = /^([0-9a-z]+)(?:\.([0-9a-z]+))?$/.exec(parte);
    if (!m) return null;
    const valor = parseInt(m[1], 36);
    const vezes = m[2] === undefined ? 1 : parseInt(m[2], 36);
    if (!Number.isInteger(valor) || !Number.isInteger(vezes) || vezes < 1 || saida.length + vezes > total) return null;
    for (let k = 0; k < vezes; k++) saida.push(valor);
  }
  return saida.length === total ? saida : null;
}

type MapaBruto = Record<string, unknown> & { largura?: unknown; altura?: unknown; camadas?: unknown };

const eObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Mapas com um lado acima do limite antigo são guardados comprimidos. */
export function precisaComprimir(mapa: unknown): boolean {
  if (!eObjeto(mapa)) return false;
  const m = mapa as MapaBruto;
  return typeof m.largura === 'number' && typeof m.altura === 'number' && (m.largura > LADO_ANTIGO_DO_MAPA || m.altura > LADO_ANTIGO_DO_MAPA);
}

/** Troca as camadas (listas) por textos comprimidos, se o mapa for grande. Qualquer outro dado volta igual. */
export function comprimirMapa<T>(dados: T): T {
  if (!precisaComprimir(dados)) return dados;
  const m = dados as unknown as MapaBruto;
  if (!eObjeto(m.camadas)) return dados;
  const camadas: Record<string, unknown> = {};
  for (const [nome, valores] of Object.entries(m.camadas)) {
    camadas[nome] = Array.isArray(valores) && valores.every((v) => typeof v === 'number' && Number.isInteger(v) && v >= 0) ? comprimirCamada(valores as number[]) : valores;
  }
  return { ...m, camadas } as unknown as T;
}

/**
 * Devolve o mapa com as camadas em listas. Mapas que já estão em listas (os pequenos e os antigos) e qualquer outro
 * dado voltam iguais; texto corrompido também fica como está (o validador do mapa recusa depois).
 */
export function descomprimirMapa<T>(dados: T): T {
  if (!eObjeto(dados)) return dados;
  const m = dados as MapaBruto;
  if (!eObjeto(m.camadas) || typeof m.largura !== 'number' || typeof m.altura !== 'number') return dados;
  if (!CAMADAS_DO_MAPA.some((c: CamadaDoMapa) => eTexto((m.camadas as Record<string, unknown>)[c]))) return dados;
  const total = m.largura * m.altura;
  const camadas: Record<string, unknown> = {};
  for (const [nome, valores] of Object.entries(m.camadas)) {
    camadas[nome] = eTexto(valores) ? (descomprimirCamada(valores, total) ?? valores) : valores;
  }
  return { ...m, camadas } as unknown as T;
}

/** Os bytes que o mapa ocupa no banco (a forma comprimida, quando é o caso). */
export function bytesGuardados(dados: unknown): number {
  return new TextEncoder().encode(JSON.stringify(comprimirMapa(dados))).length;
}
