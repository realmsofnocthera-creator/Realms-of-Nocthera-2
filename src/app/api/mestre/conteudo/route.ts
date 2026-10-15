import { NextRequest, NextResponse } from 'next/server';
import { criarConteudo, listarConteudos } from '@/server/conteudo';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Lista os itens de um tipo, sem os dados: ?tipo=mapa. */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'conteudo.ler', 'leitura', async (sessao) =>
    NextResponse.json({ itens: await listarConteudos(sessao, req.nextUrl.searchParams.get('tipo')) })
  );
}

/** Cria um item só com o rascunho: { tipo, id, nome, dados }. A permissão de edição do tipo é conferida no serviço. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'conteudo.ler', 'escrita', async (sessao) => {
    const b = await corpoDoPedido(req);
    const conteudo = await criarConteudo(sessao, { tipo: b.tipo, id: b.id, nome: b.nome, dados: b.dados }, ipDaRequisicao(req));
    return NextResponse.json({ conteudo }, { status: 201 });
  });
}
