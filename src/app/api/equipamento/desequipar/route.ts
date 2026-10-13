import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { desequiparArmaDoPersonagem, desequiparEspacoDoPersonagem } from '@/server/characterService';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { MENSAGEM_BLOQUEIO_EQUIPAR } from '@/game/equipamento';

const ERROS_REGRA = new Set<string>(Object.values(MENSAGEM_BLOQUEIO_EQUIPAR));

/** Equipamento: desequipa a arma (`tipo: "arma"`) ou o espaço de armadura (`tipo: "armadura"`, `espaco`). */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para desequipar itens.' }, { status: 401 });
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json().catch(() => ({}));
    const { tipo, espaco } = body ?? {};
    if (tipo !== 'arma' && tipo !== 'armadura') {
      return NextResponse.json({ error: 'Informe o tipo do item: "arma" ou "armadura".' }, { status: 400 });
    }
    const resposta = tipo === 'arma' ? await desequiparArmaDoPersonagem(user.uid) : await desequiparEspacoDoPersonagem(user.uid, espaco);

    return NextResponse.json({ character: resposta.character }, { status: 200 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro ao desequipar.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (ERROS_REGRA.has(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ocorreu um erro interno ao desequipar.' }, { status: 500 });
  }
}
