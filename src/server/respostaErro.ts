import { NextResponse } from 'next/server';
import { ErroPersistencia } from './persistencia';

/**
 * Resposta padrão quando o banco falha (0.5-C1): 503 com mensagem para tentar de novo.
 * Retorna null se o erro não for de persistência.
 */
export function respostaErroPersistencia(error: unknown): NextResponse | null {
  if (error instanceof ErroPersistencia) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  return null;
}
