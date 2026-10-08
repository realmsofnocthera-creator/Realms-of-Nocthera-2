import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { limitarEscrita } from '@/server/rateLimit';
import { resetarAtributos } from '@/server/characterService';

const ERROS_REGRA = new Set([
  'Nenhum ponto alocado para resetar',
  'Diamantes insuficientes',
  'Estado inconsistente',
  'Personagem não encontrado.',
  'Personagem não encontrado para atualização.',
]);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para resetar atributos.' },
        { status: 401 }
      );
    }

    const limitado = limitarEscrita(req, user.uid, 'character-atributos-resetar');
    if (limitado) return limitado;

    const character = await resetarAtributos(user.uid);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao resetar atributos.';

    if (
      ERROS_REGRA.has(message) ||
      message.toLowerCase().includes('insuficient') ||
      message.toLowerCase().includes('inconsistente') ||
      message.toLowerCase().includes('nenhum ponto')
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar o reset de atributos.' },
      { status: 500 }
    );
  }
}
