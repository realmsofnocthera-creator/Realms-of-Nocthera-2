/** Um PNG mínimo (só assinatura e cabeçalho IHDR) com as dimensões pedidas, em data URL: basta para o validador. */
export function pngDeTeste(largura: number, altura: number, bytesExtras = 0): string {
  const bytes = new Uint8Array(33 + bytesExtras);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const escrever = (i: number, v: number) => bytes.set([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], i);
  escrever(16, largura);
  escrever(20, altura);
  bytes.set([8, 6, 0, 0, 0], 24);
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

/** Os dados de um tileset válido para os testes. */
export function tilesetDeTeste(largura = 64, altura = 32, tamanhoDoTile = 16) {
  return {
    formato: 1 as const,
    imagem: pngDeTeste(largura, altura),
    larguraImagem: largura,
    alturaImagem: altura,
    tamanhoDoTile,
    margem: 0,
    espacamento: 0,
    colunas: Math.floor(largura / tamanhoDoTile),
    linhas: Math.floor(altura / tamanhoDoTile),
  };
}
