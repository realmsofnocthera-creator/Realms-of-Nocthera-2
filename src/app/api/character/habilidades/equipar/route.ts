import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { equiparHabilidade } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

const ERROS_REGRA = new Set([
  'Espaço de habilidade inválido',
  'Habilidade inválida',
  'Habilidade ainda não liberada',
  'Personagem não encontrado.',
]);

export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para equipar uma habilidade.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    let body: { slot?: unknown; habilidadeId?: unknown } | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Habilidade inválida' }, { status: 400 });
    }

    const character = await equiparHabilidade(user.uid, body?.slot, body?.habilidadeId);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao equipar a habilidade.';

    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao equipar a habilidade.' },
      { status: 500 }
    );
  }
}
