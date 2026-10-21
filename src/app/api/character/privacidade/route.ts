import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { definirPrivacidade, lerPrivacidade } from '@/server/social';

/** O que o jogador mostra no Ranking e na Busca. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    return NextResponse.json(await lerPrivacidade(user.uid));
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    registrarLog('ERROR', 'social.privacidade_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/** Muda o que o jogador mostra: { escondidoNoRanking?, escondidoNaBusca? }. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await definirPrivacidade(user.uid, { escondidoNoRanking: b.escondidoNoRanking, escondidoNaBusca: b.escondidoNaBusca }));
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    registrarLog('ERROR', 'social.privacidade_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
