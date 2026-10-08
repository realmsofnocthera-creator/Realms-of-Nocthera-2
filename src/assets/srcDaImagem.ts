/** Imagem importada de src/assets: o bundler entrega a URL final (com hash) em `src`. */
export type ImagemImportada = string | { src: string };

export function srcDaImagem(imagem: ImagemImportada): string {
  return typeof imagem === 'string' ? imagem : imagem.src;
}
