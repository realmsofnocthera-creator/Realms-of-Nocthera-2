import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { fabricarArmadura } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_ARMADURA } from '@/game/armaduraForja';

const ERROS_REGRA = new Set<string>(Object.values(MENSAGEM_BLOQUEIO_ARMADURA));

/** Ferreiro: fabrica uma peça de armadura (receita, ouro e sorteio do atributo no servidor). */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para usar o Ferreiro.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json().catch(() => ({}));
    const { pecaId } = body ?? {};
    const resposta = await fabricarArmadura(user.uid, pecaId);

    return NextResponse.json(
      { character: resposta.character, armadura: resposta.armadura, transaction: resposta.transaction },
      { status: 200 }
    );
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro no Ferreiro.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno no Ferreiro.' }, { status: 500 });
  }
}
