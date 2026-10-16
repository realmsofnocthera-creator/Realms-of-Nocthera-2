import { NextRequest, NextResponse } from 'next/server';
import { excluirJogador } from '@/server/jogadores';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Exclui o jogador por inteiro: { motivo, confirmarNome }. Só o Dono. */
export function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  return rotaDoMestre(req, 'jogadores.dados', 'escrita', async (sessao) => {
    const { uid } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json({ resultado: await excluirJogador(sessao, uid, { motivo: b.motivo, confirmarNome: b.confirmarNome }, ipDaRequisicao(req)) });
  });
}
