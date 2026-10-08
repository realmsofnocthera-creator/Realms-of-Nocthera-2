import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { combateIdValido, executarCombate } from '@/server/characterService';
import { gerarSementeCombate } from '@/server/combateSemente';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { MONSTERS_MAP } from '@/rules/monsters';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;

    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para iniciar o combate.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;

    // Qualquer "seed" enviada pelo cliente é ignorada (0.5-B1)
    const body = await req.json().catch(() => ({}));
    const { monsterId, combateId } = body;

    if (!monsterId || typeof monsterId !== 'string') {
      return NextResponse.json(
        { error: 'Identificador de monstro inválido.' },
        { status: 400 }
      );
    }

    if (combateId !== undefined && !combateIdValido(combateId)) {
      return NextResponse.json(
        { error: 'Identificador de combate inválido.' },
        { status: 400 }
      );
    }

    const monstro = MONSTERS_MAP[monsterId];
    if (!monstro) {
      return NextResponse.json(
        { error: `Monstro "${monsterId}" não encontrado.` },
        { status: 404 }
      );
    }

    // Leitura do personagem, resolução do combate e gravação do resultado na mesma transação
    const resposta = await executarCombate(user.uid, monstro.id, {
      seed: gerarSementeCombate(),
      combateId,
    });

    return NextResponse.json(
      {
        resultado: resposta.resultado,
        character: resposta.character,
        levelUps: resposta.levelUps,
        transaction: resposta.transaction,
        mensagens: resposta.mensagens,
        combateId: resposta.combateId,
        repetido: resposta.repetido,
      },
      { status: 200 }
    );
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro durante a batalha.';
    if (message.includes('Personagem não encontrado')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
