import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../../server/auth';
import { getPublicCharacterByName } from '../../../../../server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ nome: string }> }
) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;

    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para consultar perfis públicos.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;

    const { nome } = await context.params;
    const decodedNome = decodeURIComponent(nome || '').trim();

    if (!decodedNome) {
      return NextResponse.json(
        { error: 'Informe um nome de personagem para buscar.' },
        { status: 400 }
      );
    }

    const profile = await getPublicCharacterByName(decodedNome);
    if (!profile) {
      return NextResponse.json(
        { error: `Nenhum personagem encontrado com o nome "${decodedNome}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
