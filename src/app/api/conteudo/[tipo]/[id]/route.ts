import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/server/auth';
import { lerConteudoPublicado } from '@/server/conteudo';
import { descreverErro, registrarLog } from '@/server/log';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

/** O jogo lê só a versão publicada de um conteúdo (mapa etc.). Rascunhos nunca saem por aqui. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para jogar.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;

    const { tipo, id } = await params;
    const conteudo = await lerConteudoPublicado(tipo, id);
    if (!conteudo) return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 });
    return NextResponse.json({ conteudo });
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    registrarLog('ERROR', 'conteudo.leitura_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
