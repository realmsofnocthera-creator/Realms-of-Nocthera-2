import { validarObjetos, type ObjetoDoMapa } from '@/rules/objetosDoMapa';

/**
 * Formato do mapa 2D (3.5.6.5), versão 1. O mesmo validador roda no servidor (antes de salvar ou publicar) e na tela.
 * Cada camada é uma lista com largura × altura posições, linha por linha (da esquerda para a direita, de cima para baixo).
 * Nas camadas de chão e de objetos, 0 é vazio e os outros números apontam para um tile (ver valorDoTile); na de
 * colisão, 1 bloqueia. Os objetos interativos (início, NPC, placa, baú, porta e área de monstros) ficam na lista
 * `objetos` (ver objetosDoMapa.ts); mapas antigos sem ela valem como "sem objetos".
 */
export const FORMATO_DO_MAPA = 1;
export const LADO_MINIMO_DO_MAPA = 4;
/** 128 × 128 cabe com folga num documento do banco; mapas maiores serão divididos em pedaços (3.5.6.7). */
export const LADO_MAXIMO_DO_MAPA = 128;
export const TAMANHOS_DE_TILE = [16, 24, 32, 48, 64] as const;
export const TILE_PADRAO = 32;
export const MAIOR_TILE = 65_535;
export const MAXIMO_DE_TILESETS = 16;
/** Cada tileset da lista do mapa ocupa um bloco de 4096 números: valor = posição do tileset × 4096 + tile + 1. */
export const BLOCO_DO_TILESET = 4096;

/** O número gravado no mapa para o tile `tile` (a partir de 0) do tileset na posição `tileset` da lista. */
export function valorDoTile(tileset: number, tile: number): number {
  return tileset * BLOCO_DO_TILESET + tile + 1;
}

/** O caminho inverso de valorDoTile; null para vazio (0) ou número que não aponta para tile nenhum. */
export function tileDoValor(valor: number): { tileset: number; tile: number } | null {
  const resto = valor % BLOCO_DO_TILESET;
  if (valor <= 0 || resto === 0) return null;
  return { tileset: Math.floor(valor / BLOCO_DO_TILESET), tile: resto - 1 };
}

export const CAMADAS_DO_MAPA = ['chao', 'objetos', 'colisao'] as const;
export type CamadaDoMapa = (typeof CAMADAS_DO_MAPA)[number];

export const NOME_DA_CAMADA: Readonly<Record<CamadaDoMapa, string>> = {
  chao: 'Chão',
  objetos: 'Objetos',
  colisao: 'Colisão',
};

export interface MapaDados {
  formato: typeof FORMATO_DO_MAPA;
  largura: number;
  altura: number;
  tamanhoDoTile: number;
  tilesets: string[];
  camadas: Record<CamadaDoMapa, number[]>;
  objetos: ObjetoDoMapa[];
}

export type ResultadoValidacao<T> = { ok: true; dados: T } | { ok: false; erros: string[] };

const ID_DE_TILESET = /^[a-z0-9][a-z0-9-]{1,47}$/;

/** Um mapa vazio: chão, objetos e colisão zerados. */
export function mapaVazio(largura: number, altura: number, tamanhoDoTile: number = TILE_PADRAO): MapaDados {
  const n = largura * altura;
  return {
    formato: FORMATO_DO_MAPA,
    largura,
    altura,
    tamanhoDoTile,
    tilesets: [],
    camadas: { chao: new Array(n).fill(0), objetos: new Array(n).fill(0), colisao: new Array(n).fill(0) },
    objetos: [],
  };
}

function inteiroEntre(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function chavesExtras(obj: Record<string, unknown>, permitidas: readonly string[]): string[] {
  return Object.keys(obj).filter((k) => !permitidas.includes(k));
}

/**
 * Confere o mapa inteiro e devolve uma cópia limpa (só os campos do formato, na ordem fixa).
 * Campo desconhecido é erro: o formato só muda com uma versão nova.
 */
export function validarMapa(bruto: unknown): ResultadoValidacao<MapaDados> {
  const erros: string[] = [];
  if (!ehObjeto(bruto)) return { ok: false, erros: ['O mapa precisa ser um objeto.'] };

  const extras = chavesExtras(bruto, ['formato', 'largura', 'altura', 'tamanhoDoTile', 'tilesets', 'camadas', 'objetos']);
  if (extras.length) erros.push(`Campos desconhecidos no mapa: ${extras.join(', ')}.`);
  if (bruto.formato !== FORMATO_DO_MAPA) erros.push(`Formato do mapa não suportado (esperado ${FORMATO_DO_MAPA}).`);

  const { largura, altura, tamanhoDoTile, tilesets, camadas } = bruto;
  const ladoOk = (v: unknown) => inteiroEntre(v, LADO_MINIMO_DO_MAPA, LADO_MAXIMO_DO_MAPA);
  if (!ladoOk(largura)) erros.push(`A largura vai de ${LADO_MINIMO_DO_MAPA} a ${LADO_MAXIMO_DO_MAPA} tiles.`);
  if (!ladoOk(altura)) erros.push(`A altura vai de ${LADO_MINIMO_DO_MAPA} a ${LADO_MAXIMO_DO_MAPA} tiles.`);
  if (!(TAMANHOS_DE_TILE as readonly unknown[]).includes(tamanhoDoTile)) {
    erros.push(`O tamanho do tile deve ser ${TAMANHOS_DE_TILE.join(', ')} pixels.`);
  }

  if (!Array.isArray(tilesets) || tilesets.length > MAXIMO_DE_TILESETS) {
    erros.push(`Os tilesets são uma lista de até ${MAXIMO_DE_TILESETS} identificadores.`);
  } else if (tilesets.some((t) => typeof t !== 'string' || !ID_DE_TILESET.test(t))) {
    erros.push('Identificador de tileset inválido.');
  } else if (new Set(tilesets).size !== tilesets.length) {
    erros.push('Tileset repetido na lista.');
  }

  if (!ehObjeto(camadas)) {
    erros.push('O mapa precisa das camadas chão, objetos e colisão.');
  } else {
    const extrasCamadas = chavesExtras(camadas, CAMADAS_DO_MAPA);
    if (extrasCamadas.length) erros.push(`Camadas desconhecidas: ${extrasCamadas.join(', ')}.`);
    const total = ladoOk(largura) && ladoOk(altura) ? largura * altura : null;
    for (const c of CAMADAS_DO_MAPA) {
      const valores = camadas[c];
      const nome = NOME_DA_CAMADA[c];
      if (!Array.isArray(valores)) {
        erros.push(`Falta a camada ${nome}.`);
        continue;
      }
      if (total !== null && valores.length !== total) erros.push(`A camada ${nome} deve ter ${total} posições (tem ${valores.length}).`);
      const maximo = c === 'colisao' ? 1 : MAIOR_TILE;
      if (valores.some((v) => !inteiroEntre(v, 0, maximo))) {
        erros.push(c === 'colisao' ? 'A camada Colisão só aceita 0 (livre) e 1 (bloqueado).' : `A camada ${nome} só aceita números inteiros de 0 a ${MAIOR_TILE}.`);
      } else if (c !== 'colisao') {
        const qtdTilesets = Array.isArray(tilesets) ? tilesets.length : 0;
        const fora = valores.some((v) => v !== 0 && (tileDoValor(v) === null || tileDoValor(v)!.tileset >= qtdTilesets));
        if (fora) erros.push(`A camada ${nome} usa um tile de um tileset que não está na lista do mapa.`);
      }
    }
  }

  const objetos = ladoOk(largura) && ladoOk(altura) ? validarObjetos(bruto.objetos, largura as number, altura as number, erros) : [];

  if (erros.length) return { ok: false, erros };
  const cam = camadas as Record<CamadaDoMapa, number[]>;
  return {
    ok: true,
    dados: {
      formato: FORMATO_DO_MAPA,
      largura: largura as number,
      altura: altura as number,
      tamanhoDoTile: tamanhoDoTile as number,
      tilesets: [...(tilesets as string[])],
      camadas: { chao: [...cam.chao], objetos: [...cam.objetos], colisao: [...cam.colisao] },
      objetos,
    },
  };
}
