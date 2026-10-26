import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { abrirBauDeEscolha, comprarLuta, ehModoDaArena, ErroDaArena, estadoDaArena, lutar, trocarLista, verReplay } from '@/server/arena';
import { descreverErro, registrarLog } from '@/server/log';
import { ipDaRequisicao, limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDaArena) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && /insuficiente/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** A Arena (ou a ranqueada, com ?modo=ranqueada) da semana: pontos, posição, lutas do dia, adversários, pódio e histórico. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const modo = req.nextUrl.searchParams.get('modo');
    return NextResponse.json(await estadoDaArena(user.uid, new Date(), ehModoDaArena(modo) ? modo : 'arena'));
  } catch (error) {
    return respostaDeErro(error, 'arena.ler_falhou');
  }
}

/**
 * { acao: 'lutar', alvo } | { acao: 'trocarLista' } | { acao: 'comprarLuta' } | { acao: 'replay', luta } |
 * { acao: 'abrirBau', bau, carta }; `modo: 'ranqueada'` para a Arena ranqueada.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    const modo = ehModoDaArena(b.modo) ? b.modo : 'arena';
    switch (b.acao) {
      case 'lutar':
        return NextResponse.json(await lutar(user.uid, b.alvo, ipDaRequisicao(req), new Date(), modo));
      case 'trocarLista':
        return NextResponse.json(await trocarLista(user.uid, new Date(), modo));
      case 'comprarLuta':
        return NextResponse.json(await comprarLuta(user.uid));
      case 'replay':
        return NextResponse.json(await verReplay(user.uid, b.luta, new Date(), modo));
      case 'abrirBau':
        return NextResponse.json(await abrirBauDeEscolha(user.uid, b.bau, b.carta));
      default:
        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }
  } catch (error) {
    return respostaDeErro(error, 'arena.acao_falhou');
  }
}
