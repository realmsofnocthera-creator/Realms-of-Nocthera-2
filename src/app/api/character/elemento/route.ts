import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { escolherElementoDaClasse } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

/** Feiticeiro (1.5.2): { elemento } escolhe o elemento das habilidades da classe. Devolve o personagem. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const body = await req.json().catch(() => ({}));
    const character = await escolherElementoDaClasse(user.uid, body?.elemento);
    return NextResponse.json({ character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;
    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
