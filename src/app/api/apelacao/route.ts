import { NextRequest, NextResponse } from 'next/server';
import { ErroDeApelacao, estadoDaApelacao, pedirApelacao } from '@/server/apelacao';
import { verificarLoginDaApelacao } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDeApelacao) return NextResponse.json({ error: error.message }, { status: 400 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** A sanção em vigor, o pedido de apelação dela e se ainda dá para pedir (6.5-7). Aceita conta sancionada. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verificarLoginDaApelacao(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    return NextResponse.json(await estadoDaApelacao(user.uid));
  } catch (error) {
    return respostaDeErro(error, 'apelacao.ler_falhou');
  }
}

/** { texto }: manda o pedido de apelação (um por sanção). */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verificarLoginDaApelacao(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await pedirApelacao(user.uid, b.texto));
  } catch (error) {
    return respostaDeErro(error, 'apelacao.pedir_falhou');
  }
}
