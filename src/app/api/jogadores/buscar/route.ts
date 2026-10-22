import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { buscarJogadores, ErroDeBusca } from '@/server/social';

/** Busca personagens pelo começo do nome (?q=). Não mostra quem se escondeu da Busca. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para buscar jogadores.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    return NextResponse.json({ resultados: await buscarJogadores(user.uid, req.nextUrl.searchParams.get('q')) });
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof ErroDeBusca) return NextResponse.json({ error: error.message }, { status: 400 });
    registrarLog('ERROR', 'social.busca_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
