import { NextRequest, NextResponse } from 'next/server';
import { revokeUserSessions, verifyAuthToken } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

/**
 * Logout no servidor: registra o instante do logout para que o token atual
 * (e qualquer outro de login anterior) deixe de ser aceito pela API.
 */
export async function POST(req: NextRequest) {
  const limiteIp = limitarPorIp(req, 'escrita');
  if (limiteIp) return limiteIp;

  try {
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      // Sessão já inválida: logout idempotente
      return new NextResponse(null, { status: 204 });
    }

    await revokeUserSessions(user.uid);
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const { codigo, mensagem } = descreverErro(error);
    registrarLog('ERROR', 'auth.logout_falhou', { codigo, mensagem: mensagem.slice(0, 500) });
    return NextResponse.json({ error: 'Não foi possível encerrar a sessão.' }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
