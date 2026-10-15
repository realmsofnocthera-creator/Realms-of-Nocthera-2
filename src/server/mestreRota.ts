import { NextRequest, NextResponse } from 'next/server';
import { exigirPermissao, respostaErroMestre, type SessaoMestre } from '@/server/mestre';
import { registrarLog, descreverErro } from '@/server/log';
import { limitarPorConta, limitarPorIp, type GrupoLimite } from '@/server/rateLimit';
import type { PermissaoMestre } from '@/rules/mestre';

/**
 * Casca comum das rotas administrativas: limite por IP, login, papel e permissão no servidor, limite por conta e o
 * tratamento dos erros. A permissão é conferida ANTES de qualquer leitura ou gravação da rota.
 */
export async function rotaDoMestre(
  req: NextRequest,
  permissao: PermissaoMestre,
  grupo: GrupoLimite,
  fn: (sessao: SessaoMestre) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const limiteIp = limitarPorIp(req, grupo);
    if (limiteIp) return limiteIp;
    const sessao = await exigirPermissao(req.headers.get('authorization'), permissao);
    const limiteConta = limitarPorConta(sessao.uid, grupo);
    if (limiteConta) return limiteConta;
    return await fn(sessao);
  } catch (error) {
    const resposta = respostaErroMestre(error);
    if (resposta) return resposta;
    registrarLog('ERROR', 'mestre.rota_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
