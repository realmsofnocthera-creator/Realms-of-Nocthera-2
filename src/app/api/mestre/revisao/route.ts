import { NextRequest, NextResponse } from 'next/server';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';
import { filaDeRevisao, marcarComoRevisadas } from '@/server/revisao';

/** A fila de revisão (6.5-4): os sinais de anomalia ainda não revisados, dos mais novos para os mais antigos. */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ler', 'leitura', async (sessao) => NextResponse.json({ fila: await filaDeRevisao(sessao) }));
}

/** Marca entradas da fila como revisadas: { ids: [...] }. Fica no log. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.sancionar', 'escrita', async (sessao) => {
    const b = await corpoDoPedido(req);
    return NextResponse.json(await marcarComoRevisadas(sessao, b.ids, ipDaRequisicao(req)));
  });
}
