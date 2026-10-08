import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../server/auth';
import { updateCharacterAvatar } from '../../../../server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

async function handleUpdateAvatar(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para alterar seu avatar.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json();
    const avatarId = typeof body?.avatarId === 'string' ? body.avatarId : '';

    const character = await updateCharacterAvatar(user.uid, avatarId);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  return handleUpdateAvatar(req);
}

export async function POST(req: NextRequest) {
  return handleUpdateAvatar(req);
}
