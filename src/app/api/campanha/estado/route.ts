import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { campanhaEstado } from '@/server/characterService';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

/** Onde o jogador está no mundo da Campanha e o mapa publicado em que ele está. Não grava nada. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para jogar.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    return NextResponse.json(await campanhaEstado(user.uid));
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    registrarLog('ERROR', 'campanha.estado_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
