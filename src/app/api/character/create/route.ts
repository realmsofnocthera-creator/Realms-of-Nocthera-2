import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../server/auth';
import { limitarEscrita } from '../../../../server/rateLimit';
import { createCharacter } from '../../../../server/characterService';
import { PersistenciaIndisponivelError } from '../../../../server/persistence';

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

    const limitado = limitarEscrita(req, user.uid, 'character-create');
    if (limitado) return limitado;

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
    if (error instanceof PersistenciaIndisponivelError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
