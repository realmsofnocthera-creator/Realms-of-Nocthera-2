import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { ErroDoChefeMundial, estadoDoChefeMundial, lutarChefeMundial } from '@/server/chefeMundial';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDoChefeMundial) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** O chefe do dia, o meu melhor, a minha posição, o ranking e as faixas. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDoChefeMundial(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'chefeMundial.ler_falhou');
  }
}

/** Uma luta contra o chefe do dia. Devolve a mensagem, o dano e o estado novo. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;
    const r = await lutarChefeMundial(user.uid);
    return NextResponse.json({ ...r, estado: await estadoDoChefeMundial(user.uid) });
  } catch (error) {
    return respostaDeErro(error, 'chefeMundial.lutar_falhou');
  }
}
