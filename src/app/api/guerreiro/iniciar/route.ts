import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { combateIdValido, executarGuerreiro } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_GUERREIRO } from '@/game/guerreiro';

const ERROS_REGRA = new Set<string>([
  ...Object.values(MENSAGEM_BLOQUEIO_GUERREIRO),
  'Identificador de combate já usado fora da Provação do Guerreiro.',
]);

/**
 * Provação do Guerreiro: uma luta contra o chefe da dificuldade escolhida. O nível, a dificuldade liberada, o chefe
 * disponível e a tentativa do dia são conferidos no servidor, a semente é do servidor e a luta, a tentativa gasta e
 * os emblemas são gravados na mesma transação.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para enfrentar o Guerreiro.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;

    // Qualquer "seed" enviada pelo cliente é ignorada (0.5-B1)
    const body = await req.json().catch(() => ({}));
    const { dificuldade, combateId } = body ?? {};

    if (combateId !== undefined && !combateIdValido(combateId)) {
      return NextResponse.json({ error: 'Identificador de combate inválido.' }, { status: 400 });
    }

    const resposta = await executarGuerreiro(user.uid, dificuldade, { seed: gerarSementeCombate(), combateId });
    return NextResponse.json(resposta, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro durante a Provação do Guerreiro.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno ao processar a Provação do Guerreiro.' }, { status: 500 });
  }
}
