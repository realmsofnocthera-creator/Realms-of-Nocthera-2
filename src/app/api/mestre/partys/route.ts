import { NextRequest, NextResponse } from 'next/server';
import { listarPartysDoMestre } from '@/server/guildasMestre';
import { rotaDoMestre } from '@/server/mestreRota';

/** As parties do Teste de Equipe mexidas mais recentemente (só leitura). */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'jogadores.ler', 'leitura', async (sessao) => NextResponse.json({ partys: await listarPartysDoMestre(sessao) }));
}
