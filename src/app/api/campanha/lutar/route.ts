import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { ErroDaCampanha } from '@/server/campanha';
import { campanhaLutar, combateIdValido } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

/**
 * Luta numa área de monstros do mapa atual: { objetoId, posicao?, combateId? }. A semente é do servidor (qualquer
 * "seed" enviada é ignorada). A posição (mapaId, x, y) vale como checkpoint junto com a luta.
 */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para jogar.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    if (b.combateId !== undefined && !combateIdValido(b.combateId)) {
      return NextResponse.json({ error: 'Identificador de combate inválido.' }, { status: 400 });
    }
    const r = await campanhaLutar(user.uid, b.objetoId, { seed: gerarSementeCombate(), combateId: b.combateId, posicao: b.posicao });
    return NextResponse.json({
      resultado: r.resultado,
      character: r.character,
      levelUps: r.levelUps,
      transaction: r.transaction,
      mensagens: r.mensagens,
      combateId: r.combateId,
      repetido: r.repetido,
      campanha: r.campanha,
    });
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    if (error instanceof ErroDaCampanha) return NextResponse.json({ error: error.message, ...(error.descansaAte ? { descansaAte: error.descansaAte } : {}) }, { status: 400 });
    if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && error.message.includes('Identificador de combate já usado')) return NextResponse.json({ error: error.message }, { status: 400 });
    registrarLog('ERROR', 'campanha.lutar_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
