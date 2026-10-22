import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { agirNosColecionaveis, ErroDeColecionavel, estadoDosColecionaveis } from '@/server/colecionaveis';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDeColecionavel) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** Os selos, as moedas e os colecionáveis do jogador. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDosColecionaveis(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'colecionaveis.ler_falhou');
  }
}

/** { acao: buscar | ativar | reforcar | estrela, selo?, vezes?, id?, niveis? }. Devolve a mensagem, os resultados da busca e o estado novo. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await agirNosColecionaveis(user.uid, b.acao, { selo: b.selo, vezes: b.vezes, id: b.id, niveis: b.niveis }));
  } catch (error) {
    return respostaDeErro(error, 'colecionaveis.acao_falhou');
  }
}
