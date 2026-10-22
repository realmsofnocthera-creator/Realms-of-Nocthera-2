import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { agirNoCorreio, ErroDeCorreio, estadoDoCorreio } from '@/server/correio';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDeCorreio) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** As mensagens do Correio (manda antes as recompensas do Chefe Mundial dos dias que fecharam). */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDoCorreio(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'correio.ler_falhou');
  }
}

/** { acao: resgatar | resgatarTudo | apagar, id? }. Devolve a mensagem e o Correio novo. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await agirNoCorreio(user.uid, b.acao, { id: b.id }));
  } catch (error) {
    return respostaDeErro(error, 'correio.acao_falhou');
  }
}
