import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { ErroDaCampanha } from '@/server/campanha';
import { campanhaCena } from '@/server/characterService';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

/** Uma cena PUBLICADA para tocar na Campanha: ?id=<cena>. Não grava nada. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para jogar.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    return NextResponse.json({ cena: await campanhaCena(user.uid, req.nextUrl.searchParams.get('id')) });
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof ErroDaCampanha) return NextResponse.json({ error: error.message }, { status: 400 });
    registrarLog('ERROR', 'campanha.cena_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
