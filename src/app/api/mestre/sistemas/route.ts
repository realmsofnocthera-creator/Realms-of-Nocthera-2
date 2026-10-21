import { NextRequest, NextResponse } from 'next/server';
import { corpoDoPedido, rotaDoMestre } from '@/server/mestreRota';
import { ipDaRequisicao } from '@/server/rateLimit';
import { definirCenaDeAbertura, definirMapaInicial, definirRegrasDeGuilda, definirSistema, lerSistemasDoPainel } from '@/server/sistemasPainel';

/** A configuração atual dos sistemas e da manutenção (quem entra no painel vê). */
export function GET(req: NextRequest) {
  return rotaDoMestre(req, 'painel.entrar', 'leitura', async (sessao) => NextResponse.json({ configuracao: await lerSistemasDoPainel(sessao) }));
}

/** Liga ou desliga: { alvo: "manutencao" | "<sistema>", ativo, mensagem?, motivo }. Só o Dono. */
export function POST(req: NextRequest) {
  return rotaDoMestre(req, 'sistemas.gerir', 'escrita', async (sessao) => {
    const b = await corpoDoPedido(req);
    // { alvo: "campanha-mapa-inicial", mapa, motivo }: o mapa onde a Campanha começa
    if (b.alvo === 'campanha-mapa-inicial') return NextResponse.json({ configuracao: await definirMapaInicial(sessao, { mapa: b.mapa, motivo: b.motivo }, ipDaRequisicao(req)) });
    // { alvo: "campanha-cena-abertura", cena, motivo }: a cena tocada uma vez antes do primeiro mapa
    if (b.alvo === 'campanha-cena-abertura') return NextResponse.json({ configuracao: await definirCenaDeAbertura(sessao, { cena: b.cena, motivo: b.motivo }, ipDaRequisicao(req)) });
    // { alvo: "guildas-regras", regras: { nivelMinimo, custoOuro, maxMembros }, motivo }: as regras das Guildas
    if (b.alvo === 'guildas-regras') return NextResponse.json({ configuracao: await definirRegrasDeGuilda(sessao, { regras: b.regras, motivo: b.motivo }, ipDaRequisicao(req)) });
    return NextResponse.json({ configuracao: await definirSistema(sessao, { alvo: b.alvo, ativo: b.ativo, mensagem: b.mensagem, motivo: b.motivo }, ipDaRequisicao(req)) });
  });
}
