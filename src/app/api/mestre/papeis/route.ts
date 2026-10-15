import { NextRequest, NextResponse } from 'next/server';
import { concederPapel, ErroMestre, listarPapeis, revogarPapel } from '@/server/mestre';
import { rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';

async function corpo(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : {};
  } catch {
    throw new ErroMestre(400, 'Pedido inválido.');
  }
}

/** Lista os papéis (o Dono do ambiente e os concedidos pelo painel). */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'papeis.gerir', 'leitura', async (sessao) => NextResponse.json({ papeis: await listarPapeis(sessao) }));
}

/** Concede ou troca um papel: { uidAlvo, papel, motivo }. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'papeis.gerir', 'escrita', async (sessao) => {
    const b = await corpo(req);
    await concederPapel(sessao, { uidAlvo: b.uidAlvo, papel: b.papel, motivo: b.motivo }, ipDaRequisicao(req));
    return NextResponse.json({ papeis: await listarPapeis(sessao) });
  });
}

/** Tira um papel: { uidAlvo, motivo }. */
export function DELETE(req: NextRequest) {
  return rotaDoMestre(req, 'papeis.gerir', 'escrita', async (sessao) => {
    const b = await corpo(req);
    await revogarPapel(sessao, { uidAlvo: b.uidAlvo, motivo: b.motivo }, ipDaRequisicao(req));
    return NextResponse.json({ papeis: await listarPapeis(sessao) });
  });
}
