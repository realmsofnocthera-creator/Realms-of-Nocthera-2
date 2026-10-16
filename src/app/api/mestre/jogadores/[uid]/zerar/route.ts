import { NextRequest, NextResponse } from 'next/server';
import { zerarProgressaoDoJogador } from '@/server/jogadores';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Zera a progressão do jogador: { motivo, confirmarNome }. Só o Dono. */
export function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  return rotaDoMestre(req, 'jogadores.dados', 'escrita', async (sessao) => {
    const { uid } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json({ jogador: await zerarProgressaoDoJogador(sessao, uid, { motivo: b.motivo, confirmarNome: b.confirmarNome }, ipDaRequisicao(req)) });
  });
}
