import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { ascenderHabilidade } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

const ERROS_REGRA = new Set([
  'Ascensão no nível máximo',
  'Ascensão bloqueada: Reforço de Habilidade abaixo do nível 30',
  'Fragmentos de ascensão insuficientes',
  'Personagem não encontrado.',
]);

/** Ascensão de Habilidade (2.2.1): sobe do A0 ao A10 gastando 1 fragmento de ascensão. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para ascender as habilidades.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const character = await ascenderHabilidade(user.uid);
    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao ascender as habilidades.';
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao processar a Ascensão de Habilidade.' },
      { status: 500 }
    );
  }
}
