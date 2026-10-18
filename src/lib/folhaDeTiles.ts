import { gradeDoTileset, recorteDoTile, TILES_POR_TILESET, type TilesetDados } from '@/rules/tileset';

/**
 * Folha de tiles (importar o produto inteiro e escolher os tiles): quais tiles da folha entram no tileset, como eles
 * são arrumados na imagem compacta e como montar essa imagem. A parte pura fica aqui para ser testada; `comporTilesetCompacto`
 * usa o canvas do navegador.
 */

export interface FolhaDeTiles {
  larguraImagem: number;
  alturaImagem: number;
  tamanhoDoTile: number;
  margem: number;
  espacamento: number;
}

/** A imagem compacta tem no máximo 16 tiles por linha (largura previsível, boa para o celular). */
export const COLUNAS_DO_COMPACTO = 16;

export function gradeDaFolha(f: FolhaDeTiles) {
  return gradeDoTileset(f.larguraImagem, f.alturaImagem, f.tamanhoDoTile, f.margem, f.espacamento);
}

/** Colunas e linhas da imagem compacta para `total` tiles. */
export function gradeCompacta(total: number) {
  const colunas = Math.max(1, Math.min(COLUNAS_DO_COMPACTO, total));
  return { colunas, linhas: Math.max(1, Math.ceil(total / colunas)) };
}

/** O tile da folha que está no ponto (x, y) da imagem, em pixels; null se cair na margem, entre tiles ou fora da folha. */
export function indiceNoPonto(x: number, y: number, f: FolhaDeTiles): number | null {
  const grade = gradeDaFolha(f);
  const passo = f.tamanhoDoTile + f.espacamento;
  const rx = x - f.margem;
  const ry = y - f.margem;
  if (rx < 0 || ry < 0) return null;
  const coluna = Math.floor(rx / passo);
  const linha = Math.floor(ry / passo);
  if (coluna >= grade.colunas || linha >= grade.linhas) return null;
  if (rx - coluna * passo >= f.tamanhoDoTile || ry - linha * passo >= f.tamanhoDoTile) return null;
  return linha * grade.colunas + coluna;
}

/** Marca ou desmarca um tile. Os novos entram no fim: a ordem da escolha é a ordem no tileset. */
export function alternarTile(selecao: readonly number[], indice: number): number[] {
  return selecao.includes(indice) ? selecao.filter((i) => i !== indice) : [...selecao, indice];
}

/** Os tiles do retângulo entre dois tiles da folha (inclusive), da esquerda para a direita e de cima para baixo. */
export function indicesDaArea(a: number, b: number, colunas: number): number[] {
  const [ca, la] = [a % colunas, Math.floor(a / colunas)];
  const [cb, lb] = [b % colunas, Math.floor(b / colunas)];
  const indices: number[] = [];
  for (let l = Math.min(la, lb); l <= Math.max(la, lb); l++) {
    for (let c = Math.min(ca, cb); c <= Math.max(ca, cb); c++) indices.push(l * colunas + c);
  }
  return indices;
}

/** Acrescenta no fim os tiles que ainda não estão na lista (respeitando o teto de tiles do tileset). */
export function acrescentarTiles(selecao: readonly number[], novos: readonly number[]): number[] {
  const resultado = [...selecao];
  for (const n of novos) if (!resultado.includes(n) && resultado.length < TILES_POR_TILESET) resultado.push(n);
  return resultado;
}

export interface RecorteParaComposicao {
  /** Onde o tile está na folha. */
  de: { x: number; y: number; lado: number };
  /** Onde ele vai na imagem compacta. */
  para: { x: number; y: number };
}

/** Para cada tile escolhido, de onde copiar e para onde. */
export function recortesDaSelecao(selecao: readonly number[], f: FolhaDeTiles): RecorteParaComposicao[] {
  const { colunas } = gradeDaFolha(f);
  const compacta = gradeCompacta(selecao.length);
  return selecao.map((indice, i) => ({
    de: recorteDoTile({ colunas, tamanhoDoTile: f.tamanhoDoTile, margem: f.margem, espacamento: f.espacamento }, indice),
    para: { x: (i % compacta.colunas) * f.tamanhoDoTile, y: Math.floor(i / compacta.colunas) * f.tamanhoDoTile },
  }));
}

export interface TilesetCompacto {
  /** PNG em data URL. */
  png: string;
  largura: number;
  altura: number;
  colunas: number;
  linhas: number;
}

/** Monta, no navegador, a imagem só com os tiles escolhidos (sem margem nem espaço entre eles). */
export function comporTilesetCompacto(folha: CanvasImageSource, f: FolhaDeTiles, selecao: readonly number[]): TilesetCompacto {
  const grade = gradeCompacta(selecao.length);
  const largura = grade.colunas * f.tamanhoDoTile;
  const altura = grade.linhas * f.tamanhoDoTile;
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O navegador não conseguiu montar a imagem.');
  ctx.imageSmoothingEnabled = false;
  for (const r of recortesDaSelecao(selecao, f)) {
    ctx.drawImage(folha, r.de.x, r.de.y, r.de.lado, r.de.lado, r.para.x, r.para.y, f.tamanhoDoTile, f.tamanhoDoTile);
  }
  return { png: canvas.toDataURL('image/png'), largura, altura, colunas: grade.colunas, linhas: grade.linhas };
}

/** Os bytes de um PNG em data URL. */
export function bytesDoPngEmDataUrl(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Os dados do tileset "só com os escolhidos", prontos para validar e salvar. */
export function dadosDoTilesetCompacto(
  compacto: Pick<TilesetCompacto, 'largura' | 'altura' | 'colunas' | 'linhas'>,
  imagemUrl: string,
  f: FolhaDeTiles,
  selecao: readonly number[],
  folhaUrl: string | null
): TilesetDados {
  return {
    formato: 1,
    imagemUrl,
    larguraImagem: compacto.largura,
    alturaImagem: compacto.altura,
    tamanhoDoTile: f.tamanhoDoTile,
    margem: 0,
    espacamento: 0,
    colunas: compacto.colunas,
    linhas: compacto.linhas,
    ...(folhaUrl
      ? { origem: { folhaUrl, larguraFolha: f.larguraImagem, alturaFolha: f.alturaImagem, margem: f.margem, espacamento: f.espacamento, tiles: [...selecao] } }
      : {}),
  };
}
