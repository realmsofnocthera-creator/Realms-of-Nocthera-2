import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { agirNaGuilda, ErroDeGuilda, estadoDaGuilda } from '@/server/guildas';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string): NextResponse {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDeGuilda) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof Error && /insuficiente/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** A guilda do jogador (membros, cargo e, para Líder e Oficial, convites e pedidos), os convites que recebeu e as regras. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para ver sua guilda.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    return NextResponse.json(await estadoDaGuilda(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'guilda.ler_falhou');
  }
}

/** Uma ação: { acao, nome?, descricao?, guildaId?, uid? }. Devolve a mensagem e o estado novo. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    const { mensagem } = await agirNaGuilda(user.uid, b.acao, { nome: b.nome, descricao: b.descricao, guildaId: b.guildaId, uid: b.uid });
    return NextResponse.json({ mensagem, estado: await estadoDaGuilda(user.uid) });
  } catch (error) {
    return respostaDeErro(error, 'guilda.acao_falhou');
  }
}
