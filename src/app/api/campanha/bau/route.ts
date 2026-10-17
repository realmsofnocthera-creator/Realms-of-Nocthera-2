import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { ErroDaCampanha } from '@/server/campanha';
import { campanhaAbrirBau } from '@/server/characterService';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

/** Abre um baú do mapa atual: { objetoId }. O baú precisa estar perto da posição salva e ainda fechado. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para jogar.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await campanhaAbrirBau(user.uid, b.objetoId));
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof ErroDaCampanha) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    registrarLog('ERROR', 'campanha.bau_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
