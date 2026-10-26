import { NextRequest, NextResponse } from 'next/server';
import { listarGuildasDoMestre, mudarGuildaDoMestre, verGuildaDoMestre } from '@/server/guildasMestre';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** As guildas com mais membros, ou as que começam com ?busca=...; com ?id=... devolve uma guilda com os membros. */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ler', 'leitura', async (sessao) => {
    const id = req.nextUrl.searchParams.get('id');
    if (id) return NextResponse.json({ guilda: await verGuildaDoMestre(sessao, id) });
    return NextResponse.json({ guildas: await listarGuildasDoMestre(sessao, req.nextUrl.searchParams.get('busca')) });
  });
}

/** { acao: 'renomear' | 'apagarDescricao' | 'dissolver', id, nome?, motivo }: só quem pode sancionar; fica no log. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.sancionar', 'escrita', async (sessao) => NextResponse.json(await mudarGuildaDoMestre(sessao, await corpoDoPedido(req), ipDaRequisicao(req))));
}
