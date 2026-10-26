import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { bloquearAutor, denunciarMensagem, desbloquearPorNome, enviarMensagem, ErroDoChat, estadoDoChat } from '@/server/chat';
import { descreverErro, registrarLog } from '@/server/log';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDoChat) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** O canal (?canal=global|guilda) com as mensagens; com ?depois=<id> traz só as novas. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;
    const p = req.nextUrl.searchParams;
    return NextResponse.json(await estadoDoChat(user.uid, p.get('canal'), p.get('depois') ?? undefined));
  } catch (error) {
    return respostaDeErro(error, 'chat.ler_falhou');
  }
}

/** { acao: 'enviar', canal, texto } | { acao: 'bloquear', canal, mensagem } | { acao: 'desbloquear', nome } | { acao: 'denunciar', canal, mensagem }. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    switch (b.acao) {
      case 'enviar':
        return NextResponse.json(await enviarMensagem(user.uid, b.canal, b.texto));
      case 'bloquear':
        return NextResponse.json(await bloquearAutor(user.uid, b.canal, b.mensagem));
      case 'desbloquear':
        return NextResponse.json(await desbloquearPorNome(user.uid, b.nome));
      case 'denunciar':
        return NextResponse.json(await denunciarMensagem(user.uid, b.canal, b.mensagem));
      default:
        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }
  } catch (error) {
    return respostaDeErro(error, 'chat.acao_falhou');
  }
}
