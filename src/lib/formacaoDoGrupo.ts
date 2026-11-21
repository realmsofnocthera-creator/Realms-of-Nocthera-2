/**
 * Onde cada aliado fica na arena da luta em grupo (Teste de Equipe), em pixels. Com 3: um na frente, no centro, e dois atrás, um de
 * cada lado. Com 2: um na frente e outro atrás, à esquerda. Os pés de quem está atrás ficam mais para cima (mais longe).
 * `xBase` e `pesBase` são o lugar do herói quando luta sozinho; o que fica embaixo da tela (a HUD) não é invadido.
 */
export interface PosicaoNaFormacao {
  x: number;
  pes: number;
}

export function posicoesDaFormacao(quantos: number, largura: number, altura: number, xBase: number, pesBase: number): PosicaoNaFormacao[] {
  const frente = { x: largura * (quantos === 2 ? 0.64 : 0.55), pes: Math.min(pesBase + altura * 0.1, altura * 0.8) };
  const atras = pesBase - altura * 0.01;
  if (quantos <= 1) return [{ x: xBase, pes: pesBase }];
  if (quantos === 2) return [frente, { x: largura * 0.36, pes: atras }];
  return [frente, { x: largura * 0.24, pes: atras }, { x: largura * 0.82, pes: atras }];
}
