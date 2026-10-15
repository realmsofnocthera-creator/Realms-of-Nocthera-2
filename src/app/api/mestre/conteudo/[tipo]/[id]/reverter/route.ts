import { NextRequest, NextResponse } from 'next/server';
import { reverterConteudo } from '@/server/conteudo';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Volta atrás: publica de novo uma versão antiga como versão nova: { versao, ultimaVersao, motivo }. */
export function POST(req: NextRequest, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  return rotaDoMestre(req, 'conteudo.publicar', 'escrita', async (sessao) => {
    const { tipo, id } = await params;
    const b = await corpoDoPedido(req);
    return NextResponse.json(
      await reverterConteudo(sessao, tipo, id, { versao: b.versao, ultimaVersao: b.ultimaVersao, motivo: b.motivo }, ipDaRequisicao(req))
    );
  });
}
