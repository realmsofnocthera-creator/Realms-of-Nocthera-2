import { NextRequest, NextResponse } from 'next/server';
import { ensaioDaLimpeza, executarLimpeza } from '@/server/limpezaMestre';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Limpeza de jogadores (só o Dono): { acao: "ensaio" } conta o que seria apagado; { acao: "executar", confirmar } apaga de verdade. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'papeis.gerir', 'escrita', async (sessao) => {
    const b = await corpoDoPedido(req);
    if (b.acao === 'executar') return NextResponse.json({ resumo: await executarLimpeza(sessao, b.confirmar, ipDaRequisicao(req)) });
    return NextResponse.json({ resumo: await ensaioDaLimpeza(sessao) });
  });
}
