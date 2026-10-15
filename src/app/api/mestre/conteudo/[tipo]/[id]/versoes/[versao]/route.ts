import { NextRequest, NextResponse } from 'next/server';
import { lerVersaoDoPainel } from '@/server/conteudo';
import { rotaDoMestre } from '@/server/mestreRota';

/** Uma versão publicada, com os dados (para ver ou trazer para o rascunho). */
export function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string; id: string; versao: string }> }) {
  return rotaDoMestre(req, 'conteudo.ler', 'leitura', async (sessao) => {
    const { tipo, id, versao } = await params;
    return NextResponse.json({ versao: await lerVersaoDoPainel(sessao, tipo, id, versao) });
  });
}
