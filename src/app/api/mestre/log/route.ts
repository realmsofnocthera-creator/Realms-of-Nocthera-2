import { NextRequest, NextResponse } from 'next/server';
import { listarLog } from '@/server/mestre';
import { rotaDoMestre } from '@/server/mestreRota';

/** O log administrativo, do mais recente para o mais antigo: ?limite=50 (máximo 200). */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'log.ler', 'leitura', async (sessao) =>
    NextResponse.json({ log: await listarLog(sessao, req.nextUrl.searchParams.get('limite')) })
  );
}
