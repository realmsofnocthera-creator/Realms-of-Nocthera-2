import { NextRequest, NextResponse } from 'next/server';
import { statusPublico } from '@/rules/sistemas';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorIp } from '@/server/rateLimit';
import { lerConfiguracaoDeSistemas } from '@/server/sistemasLeitura';
import { chaveDoSiteDoTurnstile } from '@/server/turnstile';

/**
 * Estado público do jogo (sem login): se há manutenção e quais sistemas estão desligados, com as mensagens, e a chave
 * pública do anti-bot da criação de personagem (null quando desligado).
 */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    return NextResponse.json({ ...statusPublico(await lerConfiguracaoDeSistemas()), turnstile: chaveDoSiteDoTurnstile() });
  } catch (error) {
    registrarLog('ERROR', 'status.falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
