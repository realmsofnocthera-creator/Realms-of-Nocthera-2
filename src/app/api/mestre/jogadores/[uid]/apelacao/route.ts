import { NextRequest, NextResponse } from 'next/server';
import { responderApelacao } from '@/server/jogadores';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Responde o pedido de apelação do jogador: { decisao: "aceitar" | "recusar", resposta }. */
export function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  return rotaDoMestre(req, 'jogadores.sancionar', 'escrita', async (sessao) => {
    const { uid } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json({ jogador: await responderApelacao(sessao, uid, { decisao: b.decisao, resposta: b.resposta }, ipDaRequisicao(req)) });
  });
}
