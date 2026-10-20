import { NextRequest, NextResponse } from 'next/server';
import { BYTES_MAXIMOS_DA_IMAGEM_DE_CENA } from '@/rules/cena';
import { enviarImagemDeCena } from '@/server/imagensDeCena';
import { ErroMestre } from '@/server/mestre';
import { rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Envia uma imagem de cena (PNG, JPEG ou WebP, corpo do pedido, até 1 MB) para o armazenamento de arquivos. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'conteudo.ler', 'escrita', async (sessao) => {
    const declarado = Number(req.headers.get('content-length') ?? 0);
    if (declarado > BYTES_MAXIMOS_DA_IMAGEM_DE_CENA) throw new ErroMestre(400, 'A imagem passa de 1 MB.');
    const bytes = new Uint8Array(await req.arrayBuffer());
    const imagem = await enviarImagemDeCena(sessao, bytes, ipDaRequisicao(req));
    return NextResponse.json({ imagem }, { status: 201 });
  });
}
