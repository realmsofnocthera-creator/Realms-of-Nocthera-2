import { NextRequest, NextResponse } from 'next/server';
import { apagarMensagemDoMestre, lerCanalDoMestre, silenciarNoChat, tirarSilencioDoChat } from '@/server/chatMestre';
import { ErroMestre } from '@/server/mestre';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** As mensagens de um canal (?canal=global ou guilda_<id>), com quem escreveu e quem está silenciado. */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ler', 'leitura', async (sessao) => NextResponse.json(await lerCanalDoMestre(sessao, req.nextUrl.searchParams.get('canal'))));
}

/** { acao: 'apagar', canal, mensagem, motivo } | { acao: 'silenciar', uid, duracao, motivo } | { acao: 'tirarSilencio', uid, motivo }. Só quem pode sancionar; fica no log. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.sancionar', 'escrita', async (sessao) => {
    const b = await corpoDoPedido(req);
    const ip = ipDaRequisicao(req);
    switch (b.acao) {
      case 'apagar':
        return NextResponse.json(await apagarMensagemDoMestre(sessao, b, ip));
      case 'silenciar':
        return NextResponse.json(await silenciarNoChat(sessao, b, ip));
      case 'tirarSilencio':
        return NextResponse.json(await tirarSilencioDoChat(sessao, b, ip));
      default:
        throw new ErroMestre(400, 'Ação desconhecida.');
    }
  });
}
