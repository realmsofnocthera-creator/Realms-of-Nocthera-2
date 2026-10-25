import { NextRequest, NextResponse } from 'next/server';
import { ErroEmailNaoVerificado, verifyAuthToken } from '@/server/auth';
import { descreverErro, registrarLog } from '@/server/log';
import { agirNoMercado, ErroDoMercado, estadoDoMercado } from '@/server/mercado';
import { limitarPorConta, limitarPorIp } from '@/server/rateLimit';
import { respostaErroPersistencia } from '@/server/respostaErro';

function respostaDeErro(error: unknown, evento: string) {
  const resposta = respostaErroPersistencia(error);
  if (resposta) return resposta;
  if (error instanceof ErroDoMercado || error instanceof ErroEmailNaoVerificado) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && /insuficiente/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.message.includes('Personagem não encontrado')) return NextResponse.json({ error: error.message }, { status: 404 });
  registrarLog('ERROR', evento, descreverErro(error));
  return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

/** A Troca entre jogadores (7.2): anúncios com filtros (?categoria=&raridade=&busca=&ordem=&pagina=), os meus e o que posso vender. */
export async function GET(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'leitura');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const q = req.nextUrl.searchParams;
    return NextResponse.json(
      await estadoDoMercado(user.uid, user.emailVerificado, {
        categoria: q.get('categoria') ?? undefined,
        raridade: q.get('raridade') ?? undefined,
        busca: q.get('busca') ?? undefined,
        ordem: q.get('ordem') ?? undefined,
        pagina: q.get('pagina') ?? undefined,
      })
    );
  } catch (error) {
    return respostaDeErro(error, 'mercado.ler_falhou');
  }
}

/** { acao: anunciar | comprar | cancelar, item?: { tipo, id }, quantidade?, moeda?, preco?, id? }. */
export async function POST(req: NextRequest) {
  try {
    const limiteIp = limitarPorIp(req, 'escrita');
    if (limiteIp) return limiteIp;
    const user = await verifyAuthToken(req.headers.get('authorization'));
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const limiteConta = limitarPorConta(user.uid, 'escrita');
    if (limiteConta) return limiteConta;
    const b = (await req.json().catch(() => ({}))) ?? {};
    return NextResponse.json(await agirNoMercado(user.uid, user.emailVerificado, b.acao, { item: b.item, quantidade: b.quantidade, moeda: b.moeda, preco: b.preco, id: b.id }));
  } catch (error) {
    return respostaDeErro(error, 'mercado.acao_falhou');
  }
}
