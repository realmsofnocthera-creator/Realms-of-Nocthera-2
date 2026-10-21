import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { ehCriterioDeRanking } from '@/rules/social';
import { rankingParaJogador } from '@/server/social';

/** O ranking pedido (?tipo=nivel|torre|batalha|guerreiro): o retrato guardado, a posição de quem pede e se ele está escondido. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para ver o ranking.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    const tipo = req.nextUrl.searchParams.get('tipo') ?? 'nivel';
    if (!ehCriterioDeRanking(tipo)) return NextResponse.json({ error: 'Ranking desconhecido.' }, { status: 400 });
    return NextResponse.json(await rankingParaJogador(user.uid, tipo));
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    registrarLog('ERROR', 'social.ranking_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
