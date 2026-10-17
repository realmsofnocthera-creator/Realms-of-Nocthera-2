/**
 * Tileset importado pelo Painel do Mestre (3.5.6.4), formato 1. Qualquer imagem serve: a tela converte para PNG
 * antes de enviar, e o servidor confere a assinatura e as dimensões do PNG. A imagem é cortada em tiles quadrados,
 * da esquerda para a direita e de cima para baixo, com margem (borda da imagem) e espaçamento (entre tiles) opcionais.
 */
import type { ResultadoValidacao } from '@/rules/mapa';

export const FORMATO_DO_TILESET = 1;
export const TILE_MINIMO_DO_TILESET = 8;
export const TILE_MAXIMO_DO_TILESET = 128;
export const LADO_MAXIMO_DA_IMAGEM = 4096;
/** O PNG em texto cabe num documento do banco junto com o resto (base64 ocupa 4/3 do tamanho). Só tilesets antigos. */
export const BYTES_MAXIMOS_DO_PNG = 420_000;
/** Imagem guardada no armazenamento de arquivos (R2): o documento guarda só o endereço, então o teto é maior. */
export const BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO = 1_048_576;
/** Onde a imagem fica no armazenamento: o nome é o SHA-256 do arquivo (mesma imagem, mesmo nome, nunca muda). */
export const CHAVE_DA_IMAGEM_DO_TILESET = /^tilesets\/[0-9a-f]{64}\.png$/;
export const MARGEM_MAXIMA = 32;
/** Cada tileset tem até 4095 tiles: o número do tile no mapa reserva 4096 posições por tileset (ver mapa.ts). */
export const TILES_POR_TILESET = 4095;

export interface TilesetDados {
  formato: typeof FORMATO_DO_TILESET;
  /** data:image/png;base64,... (tilesets antigos). Exatamente um entre `imagem` e `imagemUrl`. */
  imagem?: string;
  /** Endereço público da imagem no armazenamento de arquivos (R2). */
  imagemUrl?: string;
  larguraImagem: number;
  alturaImagem: number;
  tamanhoDoTile: number;
  margem: number;
  espacamento: number;
  colunas: number;
  linhas: number;
}

const PREFIXO = 'data:image/png;base64,';

/** A chave "tilesets/<hash>.png" no fim do endereço, ou null se o endereço não for de uma imagem do jogo. */
export function chaveDaImagemNoEndereco(endereco: string): string | null {
  const m = /^https:\/\/[^\s?#]+?\/(tilesets\/[0-9a-f]{64}\.png)$/.exec(endereco);
  return m ? m[1] : null;
}

/** A imagem do tileset: o endereço no armazenamento, ou o PNG em texto dos tilesets antigos. */
export function origemDaImagem(t: Pick<TilesetDados, 'imagem' | 'imagemUrl'>): string {
  return t.imagemUrl ?? t.imagem ?? '';
}
const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Quantas colunas e linhas de tiles cabem na imagem com essa grade. */
export function gradeDoTileset(larguraImagem: number, alturaImagem: number, tamanhoDoTile: number, margem: number, espacamento: number) {
  const cabem = (lado: number) => Math.max(0, Math.floor((lado - 2 * margem + espacamento) / (tamanhoDoTile + espacamento)));
  return { colunas: cabem(larguraImagem), linhas: cabem(alturaImagem) };
}

/** Onde o tile `indice` (a partir de 0) está na imagem. */
export function recorteDoTile(t: Pick<TilesetDados, 'colunas' | 'tamanhoDoTile' | 'margem' | 'espacamento'>, indice: number) {
  const coluna = indice % t.colunas;
  const linha = Math.floor(indice / t.colunas);
  const passo = t.tamanhoDoTile + t.espacamento;
  return { x: t.margem + coluna * passo, y: t.margem + linha * passo, lado: t.tamanhoDoTile };
}

function base64ParaBytes(b64: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) return null;
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Largura e altura lidas do cabeçalho do PNG (bloco IHDR), ou null se não for PNG. */
export function dimensoesDoPng(bytes: Uint8Array): { largura: number; altura: number } | null {
  if (bytes.length < 24 || ASSINATURA_PNG.some((b, i) => bytes[i] !== b)) return null;
  if (String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') return null;
  const ler = (i: number) => ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
  return { largura: ler(16), altura: ler(20) };
}

const inteiroEntre = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function validarTileset(bruto: unknown): ResultadoValidacao<TilesetDados> {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return { ok: false, erros: ['O tileset precisa ser um objeto.'] };
  const b = bruto as Record<string, unknown>;
  const erros: string[] = [];
  const permitidos = ['formato', 'imagem', 'imagemUrl', 'larguraImagem', 'alturaImagem', 'tamanhoDoTile', 'margem', 'espacamento', 'colunas', 'linhas'];
  const extras = Object.keys(b).filter((k) => !permitidos.includes(k));
  if (extras.length) erros.push(`Campos desconhecidos no tileset: ${extras.join(', ')}.`);
  if (b.formato !== FORMATO_DO_TILESET) erros.push(`Formato do tileset não suportado (esperado ${FORMATO_DO_TILESET}).`);

  let dimensoes: { largura: number; altura: number } | null = null;
  if (b.imagem !== undefined && b.imagemUrl !== undefined) {
    erros.push('Use a imagem em texto ou o endereço dela, não os dois.');
  } else if (b.imagemUrl !== undefined) {
    // a imagem está no armazenamento: o servidor confere lá que as dimensões batem (ver conteudo.ts)
    if (typeof b.imagemUrl !== 'string' || !chaveDaImagemNoEndereco(b.imagemUrl)) {
      erros.push('O endereço da imagem não é de uma imagem enviada pelo painel.');
    } else if (!inteiroEntre(b.larguraImagem, 1, LADO_MAXIMO_DA_IMAGEM) || !inteiroEntre(b.alturaImagem, 1, LADO_MAXIMO_DA_IMAGEM)) {
      erros.push(`A imagem vai de 1 a ${LADO_MAXIMO_DA_IMAGEM} pixels de lado.`);
    } else {
      dimensoes = { largura: b.larguraImagem, altura: b.alturaImagem };
    }
  } else if (typeof b.imagem !== 'string' || !b.imagem.startsWith(PREFIXO)) {
    erros.push('A imagem precisa ser um PNG (a tela converte qualquer imagem antes de enviar).');
  } else {
    const bytes = base64ParaBytes(b.imagem.slice(PREFIXO.length));
    if (!bytes) erros.push('A imagem está corrompida.');
    else if (bytes.length > BYTES_MAXIMOS_DO_PNG) erros.push(`A imagem passa de ${Math.round(BYTES_MAXIMOS_DO_PNG / 1000)} KB.`);
    else {
      dimensoes = dimensoesDoPng(bytes);
      if (!dimensoes) erros.push('O arquivo não é um PNG válido.');
    }
  }

  if (!inteiroEntre(b.tamanhoDoTile, TILE_MINIMO_DO_TILESET, TILE_MAXIMO_DO_TILESET)) {
    erros.push(`O tile vai de ${TILE_MINIMO_DO_TILESET} a ${TILE_MAXIMO_DO_TILESET} pixels.`);
  }
  if (!inteiroEntre(b.margem, 0, MARGEM_MAXIMA) || !inteiroEntre(b.espacamento, 0, MARGEM_MAXIMA)) {
    erros.push(`Margem e espaçamento vão de 0 a ${MARGEM_MAXIMA} pixels.`);
  }

  if (dimensoes) {
    if (dimensoes.largura !== b.larguraImagem || dimensoes.altura !== b.alturaImagem) erros.push('As dimensões informadas não batem com a imagem.');
    if (dimensoes.largura > LADO_MAXIMO_DA_IMAGEM || dimensoes.altura > LADO_MAXIMO_DA_IMAGEM) erros.push(`A imagem passa de ${LADO_MAXIMO_DA_IMAGEM} pixels de lado.`);
  }

  if (!erros.length && dimensoes) {
    const grade = gradeDoTileset(dimensoes.largura, dimensoes.altura, b.tamanhoDoTile as number, b.margem as number, b.espacamento as number);
    if (grade.colunas !== b.colunas || grade.linhas !== b.linhas) erros.push('Colunas e linhas não batem com a grade da imagem.');
    else if (grade.colunas * grade.linhas === 0) erros.push('Nenhum tile cabe na imagem com essa grade.');
    else if (grade.colunas * grade.linhas > TILES_POR_TILESET) erros.push(`O tileset passa de ${TILES_POR_TILESET} tiles: use um tile maior ou divida a imagem.`);
  }

  if (erros.length) return { ok: false, erros };
  return {
    ok: true,
    dados: {
      formato: FORMATO_DO_TILESET,
      ...(b.imagemUrl !== undefined ? { imagemUrl: b.imagemUrl as string } : { imagem: b.imagem as string }),
      larguraImagem: b.larguraImagem as number,
      alturaImagem: b.alturaImagem as number,
      tamanhoDoTile: b.tamanhoDoTile as number,
      margem: b.margem as number,
      espacamento: b.espacamento as number,
      colunas: b.colunas as number,
      linhas: b.linhas as number,
    },
  };
}
