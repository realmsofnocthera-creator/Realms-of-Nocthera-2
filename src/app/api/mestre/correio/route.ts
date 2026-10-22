import { NextRequest, NextResponse } from 'next/server';
import { enviarMensagemDoMestre } from '@/server/correio';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Manda uma mensagem pelo Correio (só o Dono): { destino: "todos" | uid, titulo, texto, campos?, materiais? }. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ajustar', 'escrita', async (sessao) => {
    const b = await corpoDoPedido(req);
    return NextResponse.json(await enviarMensagemDoMestre(sessao, { destino: b.destino, titulo: b.titulo, texto: b.texto, campos: b.campos, materiais: b.materiais }, ipDaRequisicao(req)));
  });
}
