import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { combateIdValido, executarTorre } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_TORRE } from '@/game/torreCelestial';

const ERROS_REGRA = new Set<string>([
  ...Object.values(MENSAGEM_BLOQUEIO_TORRE),
  'Identificador de combate já usado fora da Torre Celestial.',
]);

/**
 * Provação da Torre Celestial: uma luta contra o andar seguinte ao mais alto que o personagem já venceu. O nível,
 * o andar e as recompensas são conferidos no servidor, a semente é do servidor e a luta, o avanço e as recompensas
 * são gravados na mesma transação.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para subir a Torre.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;

    // Qualquer "seed" enviada pelo cliente é ignorada (0.5-B1)
    const body = await req.json().catch(() => ({}));
    const { combateId } = body ?? {};

    if (combateId !== undefined && !combateIdValido(combateId)) {
      return NextResponse.json({ error: 'Identificador de combate inválido.' }, { status: 400 });
    }

    const resposta = await executarTorre(user.uid, { seed: gerarSementeCombate(), combateId });
    return NextResponse.json(resposta, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro durante a Torre Celestial.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno ao processar a Torre Celestial.' }, { status: 500 });
  }
}
