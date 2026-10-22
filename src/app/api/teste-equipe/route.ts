import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { agirNoTeste, ErroDeParty, estadoDoTeste } from '@/server/testeEquipe';

function respostaDeErro(error: unknown, evento: string): NextResponse {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDeParty) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** A party do jogador, os convites que ele recebeu e as dificuldades do Teste de Equipe. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para o Teste de Equipe.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    return NextResponse.json(await estadoDoTeste(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'testeEquipe.ler_falhou');
  }
}

/** { acao: criar | convidar | aceitar | recusar | sair | pronto | iniciar, nome?, partyId?, pronto?, dificuldade? }. Devolve a mensagem, o resultado da luta (se houve) e o estado novo. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'combate');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'combate');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    const r = await agirNoTeste(user.uid, b.acao, { partyId: b.partyId, nome: b.nome, pronto: b.pronto, dificuldade: b.dificuldade });
    return NextResponse.json({ ...r, estado: await estadoDoTeste(user.uid) });
  } catch (error) {
    return respostaDeErro(error, 'testeEquipe.acao_falhou');
  }
}
