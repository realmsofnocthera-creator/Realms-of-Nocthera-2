import { NextRequest, NextResponse } from 'next/server';
import { ajustarJogador } from '@/server/jogadores';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Ajusta moedas, XP e materiais (só o Dono): { campos: { ouro: 500 }, materiais: { id: 3 }, motivo }. Valores são variações. */
export function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  return rotaDoMestre(req, 'jogadores.ajustar', 'escrita', async (sessao) => {
    const { uid } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json({ jogador: await ajustarJogador(sessao, uid, { campos: b.campos, materiais: b.materiais, motivo: b.motivo }, ipDaRequisicao(req)) });
  });
}
