import { NextRequest, NextResponse } from 'next/server';
import { BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO } from '@/rules/tileset';
import { enviarImagemDeTileset } from '@/server/imagensDoTileset';
import { ErroMestre } from '@/server/mestre';
import { rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Envia a imagem (PNG, corpo do pedido, até 1 MB) de um tileset para o armazenamento de arquivos. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'conteudo.ler', 'escrita', async (sessao) => {
    const declarado = Number(req.headers.get('content-length') ?? 0);
    if (declarado > BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO) throw new ErroMestre(400, 'A imagem passa de 1 MB.');
    const bytes = new Uint8Array(await req.arrayBuffer());
    const imagem = await enviarImagemDeTileset(sessao, bytes, ipDaRequisicao(req));
    return NextResponse.json({ imagem }, { status: 201 });
  });
}
