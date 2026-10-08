import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { distribuirPontos } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

const ERROS_REGRA = new Set([
  'Distribuição inválida',
  'Pontos insuficientes',
  'Personagem não encontrado.',
  'Personagem não encontrado para atualização.',
]);

export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para distribuir atributos.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json().catch(() => ({}));
    const distribuicao = body?.distribuicao;

    const character = await distribuirPontos(user.uid, distribuicao);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao distribuir atributos.';

    if (ERROS_REGRA.has(message) || message.toLowerCase().includes('inválid') || message.toLowerCase().includes('insuficient')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar a distribuição de pontos.' },
      { status: 500 }
    );
  }
}
