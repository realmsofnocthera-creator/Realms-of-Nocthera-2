import { NextRequest, NextResponse } from 'next/server';
import { exportarJogador } from '@/server/jogadores';
import { rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Todos os dados do jogador em JSON (LGPD). Só o Dono; fica no log. */
export function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  return rotaDoMestre(req, 'jogadores.dados', 'leitura', async (sessao) => {
    const { uid } = await params;
    return NextResponse.json({ exportacao: await exportarJogador(sessao, uid, ipDaRequisicao(req)) });
  });
}
