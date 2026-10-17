import { NextRequest, NextResponse } from 'next/server';
import { verificarMapaDoPainel } from '@/server/conteudo';
import { rotaDoMestre } from '@/server/mestreRota';

/** Problemas do mapa antes de publicar: { problemas: [{ nivel: "erro" | "aviso", texto, objetoId? }] }. Só para mapas. */
export function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  return rotaDoMestre(req, 'conteudo.ler', 'leitura', async (sessao) => {
    const { tipo, id } = await params;
    return NextResponse.json({ problemas: await verificarMapaDoPainel(sessao, tipo, id) });
  });
}
