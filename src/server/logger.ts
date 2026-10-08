/**
 * Log estruturado (uma linha de JSON por evento) para falhas observáveis (0.5-C4).
 */
type Nivel = 'info' | 'warn' | 'error';

export function logEvento(nivel: Nivel, evento: string, dados: Record<string, unknown> = {}): void {
  const linha = JSON.stringify({
    nivel,
    evento,
    ts: new Date().toISOString(),
    ...dados,
  });
  if (nivel === 'error') {
    console.error(linha);
  } else if (nivel === 'warn') {
    console.warn(linha);
  } else {
    console.log(linha);
  }
}

export function descreverErro(error: unknown): { codigo: string; mensagem: string } {
  const err = error as { code?: number | string; message?: string };
  return {
    codigo: String(err?.code ?? 'N/A'),
    mensagem: err?.message ?? String(error),
  };
}
