import { NextRequest, NextResponse } from 'next/server';
import { BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA } from '@/rules/mapa';
import { enviarImagemDoMapa } from '@/server/imagensDoMapa';
import { ErroMestre } from '@/server/mestre';
import { rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

/** Envia a imagem de fundo (PNG, corpo do pedido, até 24 MB) de um mapa de imagem para o armazenamento de arquivos. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'conteudo.ler', 'escrita', async (sessao) => {
    const declarado = Number(req.headers.get('content-length') ?? 0);
    if (declarado > BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA) throw new ErroMestre(400, 'A imagem passa de 24 MB.');
    const bytes = new Uint8Array(await req.arrayBuffer());
    const imagem = await enviarImagemDoMapa(sessao, bytes, ipDaRequisicao(req));
    return NextResponse.json({ imagem }, { status: 201 });
  });
}
