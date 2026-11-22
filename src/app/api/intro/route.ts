import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { gerarSementeCombate } from '@/server/combateSemente';
import { ErroDaIntro, executarIntro } from '@/server/intro';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

/** A introdução do jogo: a luta do lobo (vitória garantida, leva ao nível 2) e a da criatura de 9★ (derrota roteirizada). Uma vez por personagem. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;
    return NextResponse.json(await executarIntro(user.uid, gerarSementeCombate()));
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof ErroDaIntro) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    registrarLog('ERROR', 'intro.falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
