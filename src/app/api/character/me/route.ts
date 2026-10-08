import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { getCharacterByUid } from '@/server/characterService';
import { PersistenciaIndisponivelError } from '@/server/persistence';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para acessar seus dados.' },
        { status: 401 }
      );
    }

    const character = await getCharacterByUid(user.uid);

    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    if (error instanceof PersistenciaIndisponivelError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Erro ao carregar dados do personagem.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
