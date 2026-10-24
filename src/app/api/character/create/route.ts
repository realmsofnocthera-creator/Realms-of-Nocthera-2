import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { createCharacter } from '@/server/characterService';
import { ErroDeMulticonta, marcaDaRede, revisaoDeMulticonta } from '@/server/integridade';
import { descreverErro, registrarLog } from '@/server/log';
import { repositorio } from '@/server/persistencia';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { ipDaRequisicao, limitarPorConta, limitarPorIp } from '@/server/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;

    const authHeader = req.headers.get('authorization');
    const user = await verifyAuthToken(authHeader);

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para criar seu personagem.' },
        { status: 401 }
      );
    }

    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;

    const body = await req.json();

    let character;
    try {
      character = await createCharacter(
        user.uid,
        {
          nome: body.nome,
          ...(typeof body.avatarId === 'string' ? { avatarId: body.avatarId } : {}),
          racaId: typeof body.racaId === 'string' ? body.racaId : '',
          classeId: typeof body.classeId === 'string' ? body.classeId : '',
          linhagem: typeof body.linhagem === 'string' ? body.linhagem : undefined,
          pontos: body.pontos,
        },
        { rede: marcaDaRede(ipDaRequisicao(req)) }
      );
    } catch (error) {
      if (!(error instanceof ErroDeMulticonta)) throw error;
      // A conta barrada vai para a fila de revisão do Painel do Mestre, com as contas da mesma rede
      await repositorio.gravarRevisao(revisaoDeMulticonta(user.uid, error.contasDaRede, new Date())).catch((e) => registrarLog('ERROR', 'integridade.revisao_falhou', descreverErro(e)));
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    const erroBanco = respostaErroPersistencia(error);
    if (erroBanco) return erroBanco;

    const message = error instanceof Error ? error.message : 'Erro interno do servidor.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
