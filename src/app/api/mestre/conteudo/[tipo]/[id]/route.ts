import { NextRequest, NextResponse } from 'next/server';
import { lerConteudoDoPainel, salvarRascunho } from '@/server/conteudo';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

type Contexto = { params: Promise<{ tipo: string; id: string }> };

/** O item com o rascunho e o histórico de versões (sem os dados das versões). */
export function GET(req: NextRequest, { params }: Contexto) {
  return rotaDoMestre(req, 'conteudo.ler', 'leitura', async (sessao) => {
    const { tipo, id } = await params;
    return NextResponse.json(await lerConteudoDoPainel(sessao, tipo, id));
  });
}

/** Salva o rascunho: { dados, revisao, nome? }. 409 se outra pessoa salvou depois que você abriu. */
export function PUT(req: NextRequest, { params }: Contexto) {
  return rotaDoMestre(req, 'conteudo.ler', 'escrita', async (sessao) => {
    const { tipo, id } = await params;
    const b = await corpoDoPedido(req);
    const conteudo = await salvarRascunho(sessao, tipo, id, { dados: b.dados, revisao: b.revisao, nome: b.nome }, ipDaRequisicao(req));
    return NextResponse.json({ conteudo });
  });
}
