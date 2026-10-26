import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { ErroDaArena } from '@/server/arena';
import { estadoDoCampeonato, replayDoCampeonato } from '@/server/campeonato';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDaArena) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** O Campeonato: a próxima edição, a chave da de hoje (ou da última), os prêmios e os baús míticos. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDoCampeonato(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'campeonato.ler_falhou');
  }
}

/** { acao: 'replay', dia, rodada, luta }: assiste a uma luta da chave. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    if (b.acao !== 'replay') return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    return NextResponse.json(await replayDoCampeonato(user.uid, b.dia, b.rodada, b.luta));
  } catch (error) {
    return respostaDeErro(error, 'campeonato.acao_falhou');
  }
}
