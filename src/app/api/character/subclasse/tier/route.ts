import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { subirTierSubclasse } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

const ERROS_REGRA = new Set([
  'Subclasse inválida',
  'Subclasse não desbloqueada',
  'Tier máximo atingido',
  'Ouro insuficiente',
  'Fragmentos de alma insuficientes',
  'Fragmentos de subclasse insuficientes',
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
        { error: 'Não autorizado. Faça login para subir o tier da subclasse.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    let body: { subclasseId?: unknown } | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Subclasse inválida' }, { status: 400 });
    }

    const subclasseId = body?.subclasseId;
    const character = await subirTierSubclasse(user.uid, subclasseId);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao subir o tier da subclasse.';

    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar o tier da subclasse.' },
      { status: 500 }
    );
  }
}
