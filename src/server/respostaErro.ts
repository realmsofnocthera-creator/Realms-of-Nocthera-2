import { NextResponse } from 'next/server';
import { ErroPersistencia } from './persistencia';
import { ErroContaSancionada } from './sancoes';
import { ErroManutencao, ErroSistemaDesligado } from './errosDeSistema';

/**
 * Resposta padrão dos erros que vêm da autenticação e do banco: 503 quando o banco falha (0.5-C1), com mensagem
 * para tentar de novo, 403 com o motivo quando a conta está suspensa ou banida (3.5.4.3) e 503 com a mensagem do
 * painel quando o jogo está em manutenção ou o sistema foi desligado (3.5.5.2).
 * Retorna null se o erro não for de nenhum desses tipos.
 */
export function respostaErroPersistencia(error: unknown): NextResponse | null {
  if (error instanceof ErroPersistencia) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof ErroContaSancionada) {
    return NextResponse.json({ error: error.message, contaSancionada: true, tipo: error.sancao.tipo, ate: error.sancao.ate }, { status: 403 });
  }
  if (error instanceof ErroManutencao) {
    return NextResponse.json({ error: error.message, manutencao: true }, { status: 503 });
  }
  if (error instanceof ErroSistemaDesligado) {
    return NextResponse.json({ error: error.message, sistemaDesligado: error.sistema }, { status: 503 });
  }
  return null;
}
