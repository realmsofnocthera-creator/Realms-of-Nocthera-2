import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { reforjarArma } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_FORJA } from '@/game/forja';

const ERROS_REGRA = new Set<string>(Object.values(MENSAGEM_BLOQUEIO_FORJA));

/** Forja: reforja uma arma (sorteia de novo os pontos do atributo, mantendo o tipo). */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para usar a Forja.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json().catch(() => ({}));
    const { armaId } = body ?? {};
    const resposta = await reforjarArma(user.uid, armaId);

    return NextResponse.json(
      { character: resposta.character, arma: resposta.arma, transaction: resposta.transaction },
      { status: 200 }
    );
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro na Forja.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno na Forja.' }, { status: 500 });
  }
}
