import { NextRequest, NextResponse } from 'next/server';
import { buscarJogador } from '@/server/jogadores';
import { rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Procura um jogador por e-mail, nome do personagem ou uid: ?busca=... Devolve a ficha e entra no log. */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ler', 'leitura', async (sessao) =>
    NextResponse.json({ jogador: await buscarJogador(sessao, req.nextUrl.searchParams.get('busca'), ipDaRequisicao(req)) })
  );
}
