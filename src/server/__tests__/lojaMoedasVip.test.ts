import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as comprasPost } from '@/app/api/compras/route';
import { limparCacheRevogacao } from '@/server/auth';
import { abrirBauDeEscolha, opcoesDoBau } from '@/server/arena';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { comprarNoTeste, criarPedido, confirmarPagamento, estadoDaLojaVip, estornarPedido } from '@/server/compras';
import { limparCacheDoCorreio } from '@/server/correio';
import { comprarComMoedasVip } from '@/server/lojaMoedasVip';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { ITENS_DA_LOJA_VIP, itemDaLojaVip } from '@/rules/lojaMoedasVip';
import { TIPOS_EMBLEMA } from '@/rules/emblemasCatalogo';
import { configuracaoPadrao } from '@/rules/sistemas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as { message: string });
const OUTUBRO = new Date('2026-10-27T15:00:00.000Z');
const NOVEMBRO = new Date('2026-11-01T15:00:00.000Z');

async function lojaVip(ligada: boolean) {
  const c = configuracaoPadrao();
  c.sistemas.lojaVip = { ativo: ligada, mensagem: '' };
  await repositorio.gravarConfiguracaoDeSistemas(c);
  limparCacheDeSistemas();
}

describe('Loja de Moedas VIP (8.5): regras', () => {
  it('tem os 2 baús (200 Moedas, até 4 por mês) e os materiais de mundo comuns a épicos, com os preços do Yuri', () => {
    const baus = ITENS_DA_LOJA_VIP.filter((i) => i.tipo !== 'material');
    expect(baus.map((b) => [b.chave, b.preco, b.limiteMensal])).toEqual([['bau:emblemaLendario', 200, 4], ['bau:cartaLendaria', 200, 4]]);
    const materiais = ITENS_DA_LOJA_VIP.filter((i) => i.tipo === 'material');
    expect(materiais).toHaveLength(28);
    const por = (r: string) => materiais.filter((m) => m.raridade === r);
    expect(por('comum').every((m) => m.preco === 2 && m.limiteMensal === 100)).toBe(true);
    expect(por('raro').every((m) => m.preco === 5 && m.limiteMensal === 60)).toBe(true);
    expect(por('muitoRaro').every((m) => m.preco === 15 && m.limiteMensal === 30)).toBe(true);
    expect(por('epico').every((m) => m.preco === 40 && m.limiteMensal === 10)).toBe(true);
    expect(por('lendario')).toHaveLength(0);
    expect(new Set(ITENS_DA_LOJA_VIP.map((i) => i.chave)).size).toBe(30);
    expect(itemDaLojaVip('material:mundo-osso-bruto')).toMatchObject({ nome: 'Osso Bruto', preco: 2 });
    expect(itemDaLojaVip('nada')).toBeUndefined();
  });
});

describe('Pacote do Iniciante e Loja de Moedas VIP (8.5): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.PAGAMENTOS_MODO = 'teste';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    await lojaVip(true);
    await createCharacter('u1', { nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 5, ouro: 100, diamantes: 0 });
  });
  afterEach(() => {
    delete process.env.PAGAMENTOS_MODO;
  });

  it('o Pacote do Iniciante entrega ouro, Diamantes (sem dobrar) e um baú de escolha de emblema épico, e só vale uma vez por conta', async () => {
    const r = await comprarNoTeste('u1', 'iniciante', OUTUBRO);
    expect(r.nome).toBe('Pacote do Iniciante');
    expect(r.recebido).toEqual(['200 Diamantes', '4.000 de ouro', '1 baú de escolha de emblema épico (abra na aba VIP)']);
    const c = (await getCharacterByUid('u1'))!;
    expect(c).toMatchObject({ ouro: 4_100, diamantes: 200, gastoReal: 999, iniciantePago: true });
    expect(c.primeiraCompraFeita).toBeUndefined(); // a primeira compra em dobro é dos pacotes de Diamantes
    expect(c.bausDeEscolha).toHaveLength(1);
    expect(c.bausDeEscolha![0]).toMatchObject({ tipo: 'emblemaEpico', origem: 'Pacote do Iniciante' });
    expect(await erro(criarPedido('u1', 'iniciante', OUTUBRO))).toMatchObject({ message: 'O Pacote do Iniciante só pode ser comprado uma vez por conta.' });
    const e = await estadoDaLojaVip('u1', OUTUBRO);
    expect(e.iniciante.comprado).toBe(true);
    expect(e.baus).toHaveLength(1);
    expect(e.baus[0].opcoes.length).toBe(TIPOS_EMBLEMA.filter((t) => t.raridade === 'epico').length);
    expect((await repositorio.listarTransacoes('u1', 10)).filter((t) => t.motivo.includes('Pacote do Iniciante'))).toHaveLength(2);
  });

  it('dois pedidos abertos do Iniciante: só o primeiro pagamento entrega', async () => {
    const a = await criarPedido('u1', 'iniciante', OUTUBRO);
    const b = await criarPedido('u1', 'iniciante', OUTUBRO);
    await confirmarPagamento('u1', a.id, 'a', OUTUBRO);
    expect(await erro(confirmarPagamento('u1', b.id, 'b', OUTUBRO))).toMatchObject({ message: expect.stringMatching(/uma vez por conta/) });
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(200);
  });

  it('o baú do Iniciante deixa escolher um emblema épico, e só um dos épicos', async () => {
    await comprarNoTeste('u1', 'iniciante', OUTUBRO);
    const bau = (await getCharacterByUid('u1'))!.bausDeEscolha![0];
    const epicos = opcoesDoBau('emblemaEpico');
    expect(epicos.every((o) => o.tipo === 'emblema')).toBe(true);
    const lendario = TIPOS_EMBLEMA.find((t) => t.raridade === 'lendario')!;
    expect(await erro(abrirBauDeEscolha('u1', bau.id, lendario.id, OUTUBRO))).toMatchObject({ message: 'Escolha o emblema.' });
    await abrirBauDeEscolha('u1', bau.id, epicos[0].id, OUTUBRO);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.bausDeEscolha).toBeUndefined();
    expect(c.emblemasItens?.some((e) => e.tipo === epicos[0].id)).toBe(true);
    expect(await erro(abrirBauDeEscolha('u1', bau.id, epicos[0].id, OUTUBRO))).toMatchObject({ message: 'Esse baú já foi aberto.' });
  });

  it('o estorno do Iniciante tira o baú fechado, o ouro e os Diamantes, e conta o emblema já escolhido como não recuperado', async () => {
    await comprarNoTeste('u1', 'iniciante', OUTUBRO);
    const id = (await getCharacterByUid('u1'))!.pedidosDeCompra![0].id;
    await updateCharacter('u1', { ouro: 1_000, diamantes: 150 });
    const r = await estornarPedido('u1', id, OUTUBRO);
    expect(r.dividaGerada).toBe(50);
    expect(r.naoRecuperado).toEqual(['3.000 de ouro']);
    const c = (await getCharacterByUid('u1'))!;
    expect(c).toMatchObject({ ouro: 0, diamantes: 0, dividaDeDiamantes: 50 });
    expect(c.bausDeEscolha).toBeUndefined();
    expect(c.iniciantePago).toBe(true); // o direito não volta
    expect(c.gastoReal).toBeUndefined();
    // com o baú já aberto
    await updateCharacter('u1', { iniciantePago: false, dividaDeDiamantes: 0 });
    await comprarNoTeste('u1', 'iniciante', OUTUBRO);
    const dois = (await getCharacterByUid('u1'))!;
    await abrirBauDeEscolha('u1', dois.bausDeEscolha![0].id, opcoesDoBau('emblemaEpico')[0].id, OUTUBRO);
    const r2 = await estornarPedido('u1', dois.pedidosDeCompra!.find((p) => p.estado === 'pago')!.id, OUTUBRO);
    expect(r2.naoRecuperado).toContain('o emblema épico do baú (já aberto)');
  });

  it('compra material com Moedas VIP: tira as moedas, entrega no inventário e respeita o limite do mês', async () => {
    await updateCharacter('u1', { moedasVip: 1_000 });
    const r = await comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 10, OUTUBRO);
    expect(r.mensagem).toMatch(/10× Osso Bruto por 20 Moedas VIP/);
    let c = (await getCharacterByUid('u1'))!;
    expect(c.moedasVip).toBe(980);
    expect(c.inventario?.['mundo-osso-bruto']).toBe(10);
    await comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 90, OUTUBRO);
    expect(await erro(comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 1, OUTUBRO))).toMatchObject({ message: expect.stringMatching(/limite deste item neste mês/) });
    c = (await getCharacterByUid('u1'))!;
    expect(c.inventario?.['mundo-osso-bruto']).toBe(100);
    expect(c.moedasVip).toBe(800);
    // no mês seguinte o limite volta
    await comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 5, NOVEMBRO);
    expect((await getCharacterByUid('u1'))!.comprasMoedasVip).toEqual({ mes: '2026-11', itens: { 'material:mundo-osso-bruto': 5 } });
  });

  it('os baús de escolha custam 200 Moedas, até 4 por mês, e abrem na aba VIP', async () => {
    await updateCharacter('u1', { moedasVip: 1_000 });
    const r = await comprarComMoedasVip('u1', 'bau:emblemaLendario', 2, OUTUBRO);
    expect(r.mensagem).toMatch(/2× Baú de escolha de emblema lendário por 400 Moedas VIP/);
    await comprarComMoedasVip('u1', 'bau:cartaLendaria', 1, OUTUBRO);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.moedasVip).toBe(400);
    expect(c.bausDeEscolha!.map((b) => b.tipo)).toEqual(['emblemaLendario', 'emblemaLendario', 'cartaLendariaVip']);
    expect((await estadoDaLojaVip('u1', OUTUBRO)).baus).toHaveLength(3);
    // abre o de emblema lendário e o de carta lendária
    const emblema = opcoesDoBau('emblemaLendario')[0];
    await abrirBauDeEscolha('u1', c.bausDeEscolha![0].id, emblema.id, OUTUBRO);
    const carta = opcoesDoBau('cartaLendariaVip')[0];
    expect(carta.tipo).toBe('carta');
    await abrirBauDeEscolha('u1', c.bausDeEscolha![2].id, carta.id, OUTUBRO);
    const d = (await getCharacterByUid('u1'))!;
    expect(d.emblemasItens?.some((e) => e.tipo === emblema.id)).toBe(true);
    expect(d.cartasItens?.some((x) => x.tipo === carta.id)).toBe(true);
    expect(d.bausDeEscolha).toHaveLength(1);
    // limite: já comprou 2 de emblema; mais 3 passa de 4
    expect(await erro(comprarComMoedasVip('u1', 'bau:emblemaLendario', 3, OUTUBRO))).toMatchObject({ message: 'Você só pode comprar mais 2 deste item neste mês.' });
  });

  it('a loja só vende com a Loja VIP ligada e confere a quantidade e o item', async () => {
    await updateCharacter('u1', { moedasVip: 100 });
    expect(await erro(comprarComMoedasVip('u1', 'nada', 1, OUTUBRO))).toMatchObject({ message: 'Esse item não está na Loja de Moedas VIP.' });
    expect(await erro(comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 0, OUTUBRO))).toMatchObject({ message: 'Quantidade inválida.' });
    expect(await erro(comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 1.5, OUTUBRO))).toMatchObject({ message: 'Quantidade inválida.' });
    await updateCharacter('u1', { moedasVip: 1 });
    expect(await erro(comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 1, OUTUBRO))).toMatchObject({ message: 'Moedas VIP insuficientes.' });
    await lojaVip(false);
    expect(await erro(comprarComMoedasVip('u1', 'material:mundo-osso-bruto', 1, OUTUBRO))).toBeTruthy();
    expect((await getCharacterByUid('u1'))!.moedasVip).toBe(1);
  });

  it('as rotas: comprar com Moedas e abrir o baú', async () => {
    await updateCharacter('u1', { moedasVip: 500 });
    const req = (corpo: unknown) => new NextRequest('http://t/api/compras', { method: 'POST', headers: { authorization: `Bearer ${tokenDeTeste('u1')}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    const ok = await comprasPost(req({ acao: 'comprarMoedas', chave: 'bau:cartaLendaria', quantidade: 1 }));
    expect(ok.status).toBe(200);
    const bau = (await getCharacterByUid('u1'))!.bausDeEscolha![0];
    expect((await comprasPost(req({ acao: 'abrirBau', bau: bau.id, escolha: 'nao-existe' }))).status).toBe(400);
    expect((await comprasPost(req({ acao: 'abrirBau', bau: bau.id, escolha: opcoesDoBau('cartaLendariaVip')[0].id }))).status).toBe(200);
    expect((await comprasPost(req({ acao: 'comprarMoedas', chave: 'bau:cartaLendaria', quantidade: 5 }))).status).toBe(400);
  });
});
