import { NextRequest, NextResponse } from 'next/server';
import { identificar, papelDoUsuario, respostaErroMestre } from '@/server/mestre';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { DESCRICAO_DO_PAPEL, NOME_DO_PAPEL, permissoesDoPapel } from '@/rules/mestre';

/** Quem sou eu no painel: o papel e as permissões, ou 403 com o uid (para o Dono configurar o ambiente). */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await identificar(req.headers.get('authorization'));
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;

    const papel = await papelDoUsuario(user.uid);
    if (!papel) {
      return NextResponse.json({ error: 'Acesso restrito aos Mestres.', uid: user.uid }, { status: 403 });
    }
    return NextResponse.json({
      uid: user.uid,
      email: user.email,
      papel: papel.papel,
      nomeDoPapel: NOME_DO_PAPEL[papel.papel],
      descricao: DESCRICAO_DO_PAPEL[papel.papel],
      origem: papel.origem,
      permissoes: permissoesDoPapel(papel.papel),
    });
  } catch (error) {
    const resposta = respostaErroMestre(error);
    if (resposta) return resposta;
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
