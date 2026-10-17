import { NextRequest, NextResponse } from 'next/server';
import { TIPO_DOS_ANUNCIOS, TIPOS_DO_CATALOGO } from '@/rules/conteudo';
import { anunciosVigentes, validarAnuncio, type AnuncioDados } from '@/rules/anuncio';
import { verifyAuthToken } from '@/server/auth';
import { lerPublicadosComCache } from '@/server/catalogoItens';
import { descreverErro, registrarLog } from '@/server/log';
import { respostaErroPersistencia } from '@/server/respostaErro';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';

/** O jogo lê o catálogo publicado de um tipo (itens editados no painel). Só os tipos de catálogo; rascunhos nunca saem. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado. Faça login para jogar.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'leitura');
    if (limiteConta) return limiteConta;

    const { tipo } = await params;
    if (tipo === TIPO_DOS_ANUNCIOS) {
      // só os anúncios que aparecem agora (ativos, começados e não terminados); dado inválido é ignorado
      const validos = (await lerPublicadosComCache(TIPO_DOS_ANUNCIOS)).flatMap((i) => {
        const v = validarAnuncio(i.dados);
        return v.ok ? [{ id: i.id, nome: i.nome, versao: i.versao, dados: v.dados as AnuncioDados }] : [];
      });
      return NextResponse.json({ itens: anunciosVigentes(validos, new Date()) });
    }
    if (!(TIPOS_DO_CATALOGO as readonly string[]).includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de catálogo desconhecido.' }, { status: 404 });
    }
    return NextResponse.json({ itens: await lerPublicadosComCache(tipo as (typeof TIPOS_DO_CATALOGO)[number]) });
  } catch (error) {
    const resposta = respostaErroPersistencia(error);
    if (resposta) return resposta;
    registrarLog('ERROR', 'catalogo.leitura_falhou', descreverErro(error));
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
