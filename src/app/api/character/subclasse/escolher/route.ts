import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../../server/auth';
import { escolherSubclasse } from '../../../../../server/characterService';

const ERROS_REGRA = new Set([
  'Subclasse inválida',
  'Subclasse já ativa',
  'Nível insuficiente',
  'Ouro insuficiente',
  'Fragmentos de alma insuficientes',
  'Diamantes insuficientes',
  'Personagem não encontrado.',
]);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para escolher uma subclasse.' },
        { status: 401 }
      );
    }

    let body: { subclasseId?: unknown } | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Subclasse inválida' }, { status: 400 });
    }

    const subclasseId = body?.subclasseId;
    const character = await escolherSubclasse(user.uid, subclasseId);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao escolher subclasse.';

    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar a escolha de subclasse.' },
      { status: 500 }
    );
  }
}
