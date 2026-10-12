import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { combateIdValido, executarCacada } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_CACADA } from '@/game/cacada';

const ERROS_REGRA = new Set<string>([
  ...Object.values(MENSAGEM_BLOQUEIO_CACADA),
  'Identificador de combate já usado fora da Caçada.',
]);

/**
 * Provação da Caçada: inicia a caçada de um monstro. A estrela (nível e monstro-chave anterior) é validada no
 * servidor, a semente é do servidor e luta, XP, ouro, drops e progresso são gravados na mesma transação.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para caçar.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;

    // Qualquer "seed" enviada pelo cliente é ignorada (0.5-B1)
    const body = await req.json().catch(() => ({}));
    const { monstroId, combateId } = body ?? {};

    if (combateId !== undefined && !combateIdValido(combateId)) {
      return NextResponse.json({ error: 'Identificador de combate inválido.' }, { status: 400 });
    }

    const resposta = await executarCacada(user.uid, monstroId, { seed: gerarSementeCombate(), combateId });

    return NextResponse.json(
      {
        resultado: resposta.resultado,
        character: resposta.character,
        levelUps: resposta.levelUps,
        transaction: resposta.transaction,
        mensagens: resposta.mensagens,
        combateId: resposta.combateId,
        repetido: resposta.repetido,
        cacada: resposta.cacada,
      },
      { status: 200 }
    );
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro durante a caçada.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno ao processar a caçada.' }, { status: 500 });
  }
}
