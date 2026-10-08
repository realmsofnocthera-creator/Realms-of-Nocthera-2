import { NextRequest, NextResponse } from 'next/server';
import { revokeUserSessions, verifyAuthToken } from '@/server/auth';

/**
 * Logout no servidor: revoga as sessões do usuário para que o token atual
 * (e qualquer outro emitido antes) deixe de ser aceito pela API.
 */
export async function POST(req: NextRequest) {
  const user = await verifyAuthToken(req.headers.get('authorization'));
  if (!user) {
    // Sessão já inválida: logout idempotente
    return new NextResponse(null, { status: 204 });
  }

  try {
    await revokeUserSessions(user.uid);
  } catch {
    return NextResponse.json({ error: 'Não foi possível encerrar a sessão.' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
