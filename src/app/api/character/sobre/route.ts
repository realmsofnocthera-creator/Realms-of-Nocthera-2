import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../server/auth';
import { updateCharacterSobre } from '../../../../server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para editar seu perfil.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const sobre = typeof body?.sobre === 'string' ? body.sobre : '';

    const character = await updateCharacterSobre(user.uid, sobre);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
