import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../server/auth';
import { createCharacter } from '../../../../server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para criar seu personagem.' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const character = await createCharacter(user.uid, {
      nome: body.nome,
      ...(typeof body.avatarId === 'string' ? { avatarId: body.avatarId } : {}),
      racaId: typeof body.racaId === 'string' ? body.racaId : '',
      classeId: typeof body.classeId === 'string' ? body.classeId : '',
      linhagem: typeof body.linhagem === 'string' ? body.linhagem : undefined,
      pontos: body.pontos,
    });

    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
