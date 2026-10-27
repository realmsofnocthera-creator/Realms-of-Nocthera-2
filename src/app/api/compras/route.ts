import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { abrirBauDeEscolha, ErroDaArena } from '@/server/arena';
import { comprarNoTeste, ErroDeCompra, estadoDaLojaVip } from '@/server/compras';
import { comprarComMoedasVip } from '@/server/lojaMoedasVip';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDeCompra || error instanceof ErroDaArena) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** A Loja VIP: o nível e o progresso do VIP, a tabela de níveis, os pacotes de Diamantes e os pedidos recentes. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDaLojaVip(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'compras.ler_falhou');
  }
}

/**
 * { produto }: compra no provedor de teste (só existe com PAGAMENTOS_MODO=teste no ambiente).
 * { acao: 'comprarMoedas', chave, quantidade }: compra na Loja de Moedas VIP.
 * { acao: 'abrirBau', bau, escolha }: abre um baú de escolha vindo de uma compra.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    if (b.acao === 'comprarMoedas') return NextResponse.json(await comprarComMoedasVip(user.uid, b.chave, b.quantidade));
    if (b.acao === 'abrirBau') return NextResponse.json(await abrirBauDeEscolha(user.uid, b.bau, b.escolha));
    return NextResponse.json(await comprarNoTeste(user.uid, b.produto));
  } catch (error) {
    return respostaDeErro(error, 'compras.comprar_falhou');
  }
}
