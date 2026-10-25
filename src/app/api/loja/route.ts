import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { comprarNaLoja, ErroDaLoja, estadoDaLoja } from '@/server/loja';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDaLoja) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && /insuficiente/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** O catálogo da semana, com os saldos e o quanto já foi comprado de cada item no mês. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDaLoja(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'loja.ler_falhou');
  }
}

/** { chave, quantidade, escolha? }: compra na loja (escolha = a carta ou o emblema épico do baú de escolha). */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await comprarNaLoja(user.uid, b.chave, b.quantidade, b.escolha));
  } catch (error) {
    return respostaDeErro(error, 'loja.comprar_falhou');
  }
}
