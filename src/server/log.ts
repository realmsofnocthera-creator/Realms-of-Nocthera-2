/**
 * Log estruturado do servidor (0.5-C4).
 * Uma linha JSON por evento: o Cloud Run/Cloud Logging lê `severity` e indexa os demais campos.
 */
export type NivelLog = 'INFO' | 'WARNING' | 'ERROR';

export function registrarLog(
  nivel: NivelLog,
  evento: string,
  dados: Record<string, unknown> = {}
): void {
  const linha = JSON.stringify({
    severity: nivel,
    evento,
    ts: new Date().toISOString(),
    ...dados,
  });
  if (nivel === 'ERROR') {
    console.error(linha);
  } else if (nivel === 'WARNING') {
    console.warn(linha);
  } else {
    console.info(linha);
  }
}

/** Extrai código e mensagem de um erro desconhecido (inclui erros do gRPC/Firestore). */
export function descreverErro(error: unknown): { codigo: string; mensagem: string } {
  const err = error as { code?: number | string; message?: string };
  return {
    codigo: err?.code !== undefined ? String(err.code) : 'N/A',
    mensagem: err?.message || String(error),
  };
}
