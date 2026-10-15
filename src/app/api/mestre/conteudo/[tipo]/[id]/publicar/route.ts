import { NextRequest, NextResponse } from 'next/server';
import { publicarConteudo } from '@/server/conteudo';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Publica o rascunho como versão nova: { revisao, motivo }. */
export function POST(req: NextRequest, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  return rotaDoMestre(req, 'conteudo.publicar', 'escrita', async (sessao) => {
    const { tipo, id } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json(await publicarConteudo(sessao, tipo, id, { revisao: b.revisao, motivo: b.motivo }, ipDaRequisicao(req)));
  });
}
