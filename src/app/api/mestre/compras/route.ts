import { NextRequest, NextResponse } from 'next/server';
import { comprasDoJogadorNoPainel, estornarComoMestre } from '@/server/comprasMestre';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** ?uid=...: o VIP, os Diamantes e os pedidos de um jogador. */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ler', 'leitura', async (sessao) => NextResponse.json(await comprasDoJogadorNoPainel(sessao, req.nextUrl.searchParams.get('uid'))));
}

/** { uid, pedido, motivo }: estorna um pedido pago. Só quem ajusta jogadores (o Dono); fica no log. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ajustar', 'escrita', async (sessao) => NextResponse.json(await estornarComoMestre(sessao, await corpoDoPedido(req), ipDaRequisicao(req))));
}
