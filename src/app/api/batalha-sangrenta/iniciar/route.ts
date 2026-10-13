import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { combateIdValido, executarBatalhaSangrenta } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_BATALHA } from '@/game/batalhaSangrenta';

const ERROS_REGRA = new Set<string>([
  ...Object.values(MENSAGEM_BLOQUEIO_BATALHA),
  'Identificador de combate já usado fora da Batalha Sangrenta.',
]);

/**
 * Provação de Batalha Sangrenta: lutas seguidas, o(s) chefe(s) por último, em cinco dificuldades. O nível, a
 * dificuldade liberada e as tentativas do dia são conferidos no servidor, a semente é do servidor e as lutas, os fragmentos e a tentativa gasta são gravados
 * na mesma transação.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para batalhar.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;

    // Qualquer "seed" enviada pelo cliente é ignorada (0.5-B1)
    const body = await req.json().catch(() => ({}));
    const { dificuldade, combateId } = body ?? {};

    if (combateId !== undefined && !combateIdValido(combateId)) {
      return NextResponse.json({ error: 'Identificador de combate inválido.' }, { status: 400 });
    }

    const resposta = await executarBatalhaSangrenta(user.uid, dificuldade, { seed: gerarSementeCombate(), combateId });
    return NextResponse.json(resposta, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro durante a Batalha Sangrenta.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno ao processar a Batalha Sangrenta.' }, { status: 500 });
  }
}
