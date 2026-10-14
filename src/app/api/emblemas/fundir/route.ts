import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { fundirEmblemasDoPersonagem } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_EMBLEMA } from '@/game/emblemas';

const ERROS_REGRA = new Set<string>(Object.values(MENSAGEM_BLOQUEIO_EMBLEMA));

/** Emblemas: funde emblemas iguais (`tipo` e `estrelas`) em um com uma estrela a mais. Os equipados não entram. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para fundir emblemas.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json().catch(() => ({}));
    const { tipo, estrelas } = body ?? {};
    const resposta = await fundirEmblemasDoPersonagem(user.uid, tipo, estrelas);

    return NextResponse.json({ character: resposta.character, criado: resposta.criado }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao fundir emblemas.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno ao fundir emblemas.' }, { status: 500 });
  }
}
