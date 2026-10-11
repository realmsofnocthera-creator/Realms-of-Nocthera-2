import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { reforcarHabilidade } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

const ERROS_REGRA = new Set([
  'Reforço no nível máximo',
  'Essência de habilidade insuficiente',
  'Personagem não encontrado.',
]);

/** Reforço de Habilidade (2.2.2): sobe 1 nível gastando essência de habilidade. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para reforçar as habilidades.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const character = await reforcarHabilidade(user.uid);
    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao reforçar as habilidades.';
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar o Reforço de Habilidade.' },
      { status: 500 }
    );
  }
}
