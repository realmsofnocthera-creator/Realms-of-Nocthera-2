import { NextRequest, NextResponse } from 'next/server';
import { aplicarSancao } from '@/server/jogadores';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Aplica uma sanção ao jogador: { acao: "advertir" | "suspender" | "banir" | "desbanir", dias?, motivo }. */
export function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  return rotaDoMestre(req, 'jogadores.sancionar', 'escrita', async (sessao) => {
    const { uid } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json({ jogador: await aplicarSancao(sessao, uid, { acao: b.acao, dias: b.dias, motivo: b.motivo }, ipDaRequisicao(req)) });
  });
}
