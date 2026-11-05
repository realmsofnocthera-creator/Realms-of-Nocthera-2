/**
 * Números grandes do cabeçalho do Hub (Ouro, Diamantes e XP): 1.400 vira "1,4K", 2.300.000 vira "2,3M" e
 * 4.100.000.000 vira "4,1B". Trunca (nunca arredonda para cima, para não mostrar mais do que o jogador tem),
 * tira o ",0" e deixa abaixo de mil como está.
 */
const UNIDADES = [
  { valor: 1_000_000_000, sufixo: 'B' },
  { valor: 1_000_000, sufixo: 'M' },
  { valor: 1_000, sufixo: 'K' },
] as const;

export function formatarCompacto(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const inteiro = Math.floor(n);
  if (inteiro < 1000) return String(inteiro);
  const unidade = UNIDADES.find((u) => inteiro >= u.valor) ?? UNIDADES[UNIDADES.length - 1];
  // uma casa decimal, truncada, por aritmética inteira (sem erro de ponto flutuante)
  const decimos = Math.floor(inteiro / (unidade.valor / 10));
  const inteiros = Math.floor(decimos / 10);
  const resto = decimos % 10;
  return `${inteiros}${resto === 0 ? '' : `,${resto}`}${unidade.sufixo}`;
}

/** O total por extenso, com ponto de milhar: 25929 vira "25.929". */
export function formatarTotal(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  return Math.floor(n).toLocaleString('pt-BR');
}
