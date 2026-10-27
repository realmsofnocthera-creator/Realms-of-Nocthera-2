import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as comprasGet, POST as comprasPost } from '@/app/api/compras/route';
import { GET as mestreGet, POST as mestrePost } from '@/app/api/mestre/compras/route';
import { limparCacheRevogacao } from '@/server/auth';
import type { ResultadoCombate } from '@/game/combat';
import { applyCombatResult, createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { comprarNoTeste, confirmarPagamento, criarPedido, estadoDaLojaVip, estornarPedido, mandarOuroDoVip } from '@/server/compras';
import { comprasDoJogadorNoPainel, estornarComoMestre } from '@/server/comprasMestre';
import { estadoDoCorreio, limparCacheDoCorreio, agirNoCorreio } from '@/server/correio';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { configuracaoPadrao } from '@/rules/sistemas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as { status?: number; message: string });
const sessao = (papel: SessaoMestre['papel'], uid = papel + '1'): SessaoMestre => ({ uid, email: `${uid}@test.com`, papel, origem: papel === 'dono' ? 'ambiente' : 'painel' });
const dono = sessao('dono', 'dono1');
const suporte = sessao('suporte', 'sup1');
const AGORA = new Date('2026-10-27T15:00:00.000Z');

async function ligarLojaVip(ligada = true) {
  const c = configuracaoPadrao();
  c.sistemas.lojaVip = { ativo: ligada, mensagem: '' };
  await repositorio.gravarConfiguracaoDeSistemas(c);
  limparCacheDeSistemas();
}

describe('Compras e VIP (8.5)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.PAGAMENTOS_MODO = 'teste';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    await createCharacter('u1', { nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 5, ouro: 1_000, diamantes: 0 });
  });
  afterEach(() => {
    delete process.env.PAGAMENTOS_MODO;
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('a Loja VIP nasce desligada e sem o modo de teste ninguém compra nada', async () => {
    expect(await erro(criarPedido('u1', 'diamantes-1', AGORA))).toMatchObject({ message: expect.stringMatching(/desligad/i) });
    await ligarLojaVip();
    delete process.env.PAGAMENTOS_MODO;
    expect(await erro(criarPedido('u1', 'diamantes-1', AGORA))).toMatchObject({ message: 'As compras ainda não estão disponíveis.' });
    expect((await estadoDaLojaVip('u1')).podeComprar).toBe(false);
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(0);
  });

  it('comprar o primeiro pacote entrega o dobro, soma ao gasto, sobe o VIP e deixa o recibo', async () => {
    await ligarLojaVip();
    const r = await comprarNoTeste('u1', 'diamantes-2', AGORA); // R$ 9,99: 200 + 20
    expect(r.mensagem).toMatch(/440/);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(440);
    expect(c.gastoReal).toBe(999);
    expect(c.primeiraCompraFeita).toBe(true);
    expect(c.pedidosDeCompra).toHaveLength(1);
    expect(c.pedidosDeCompra![0]).toMatchObject({ estado: 'pago', valorCentavos: 999, diamantes: 440, provedor: 'teste' });
    expect(c.pedidosDeCompra![0].referencia).toMatch(/^teste_ped_/);
    // R$ 9,99 ainda é VIP 0; a segunda compra já não dobra
    await comprarNoTeste('u1', 'diamantes-1', AGORA); // R$ 4,99: 100
    const d = (await getCharacterByUid('u1'))!;
    expect(d.diamantes).toBe(540);
    expect(d.gastoReal).toBe(1498);
    const estado = await estadoDaLojaVip('u1');
    expect(estado.vip).toMatchObject({ nivel: 1, nome: 'Iniciado', bonus: { xp: 2, ouro: 0 }, ouroDiario: 500 });
    expect(estado.primeiraCompra).toBe(false);
    expect(estado.pacotes[0].total).toBe(100);
  });

  it('confirmar o mesmo pagamento duas vezes não entrega duas vezes', async () => {
    await ligarLojaVip();
    const pedido = await criarPedido('u1', 'diamantes-1', AGORA);
    const a = await confirmarPagamento('u1', pedido.id, 'ref_1', AGORA);
    const b = await confirmarPagamento('u1', pedido.id, 'ref_1', AGORA);
    expect(a.jaEstavaPago).toBe(false);
    expect(b.jaEstavaPago).toBe(true);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(200);
    expect(c.gastoReal).toBe(499);
    expect(await erro(confirmarPagamento('u1', 'ped_inexistente', 'x', AGORA))).toMatchObject({ message: 'Pedido não encontrado.' });
  });

  it('produto que não existe e pedidos além de 5 abertos: os mais antigos viram cancelados', async () => {
    await ligarLojaVip();
    expect(await erro(criarPedido('u1', 'diamantes-99', AGORA))).toMatchObject({ message: 'Esse produto não existe.' });
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) ids.push((await criarPedido('u1', 'diamantes-1', AGORA)).id);
    const pedidos = (await getCharacterByUid('u1'))!.pedidosDeCompra!;
    expect(pedidos.filter((p) => p.estado === 'criado')).toHaveLength(5);
    expect(pedidos.find((p) => p.id === ids[0])!.estado).toBe('cancelado');
    expect(await erro(confirmarPagamento('u1', ids[0], 'x', AGORA))).toMatchObject({ message: 'Esse pedido foi cancelado.' });
  });

  it('o estorno tira os Diamantes e o gasto, recalcula o VIP e é idempotente', async () => {
    await ligarLojaVip();
    await comprarNoTeste('u1', 'diamantes-3', AGORA); // R$ 19,99 => VIP 1, 960 Diamantes (dobro)
    let c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(960);
    expect((await estadoDaLojaVip('u1')).vip.nivel).toBe(1);
    const id = c.pedidosDeCompra![0].id;
    const r = await estornarPedido('u1', id, AGORA);
    expect(r).toMatchObject({ jaEstavaEstornado: false, dividaGerada: 0 });
    c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(0);
    expect(c.gastoReal).toBeUndefined();
    expect(c.pedidosDeCompra![0].estado).toBe('estornado');
    expect(c.primeiraCompraFeita).toBe(true); // a primeira compra em dobro continua gasta
    expect((await estadoDaLojaVip('u1')).vip.nivel).toBe(0);
    expect(await estornarPedido('u1', id, AGORA)).toMatchObject({ jaEstavaEstornado: true });
    expect(await erro(confirmarPagamento('u1', id, 'x', AGORA))).toMatchObject({ message: 'Esse pedido foi estornado.' });
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(0);
  });

  it('estornar Diamantes já gastos vira dívida: bloqueia comprar e é cobrada dos próximos Diamantes', async () => {
    await ligarLojaVip();
    await comprarNoTeste('u1', 'diamantes-1', AGORA); // 200 Diamantes
    const id = (await getCharacterByUid('u1'))!.pedidosDeCompra![0].id;
    await updateCharacter('u1', { diamantes: 50 }); // gastou 150
    const r = await estornarPedido('u1', id, AGORA);
    expect(r.dividaGerada).toBe(150);
    let c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(0);
    expect(c.dividaDeDiamantes).toBe(150);
    expect(await erro(criarPedido('u1', 'diamantes-1', AGORA))).toMatchObject({ message: expect.stringMatching(/estorno de 150/) });
    // ganhou 100: tudo vai para a dívida
    await updateCharacter('u1', { diamantes: 100 });
    expect(await erro(criarPedido('u1', 'diamantes-1', AGORA))).toBeTruthy();
    c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(0);
    expect(c.dividaDeDiamantes).toBe(50);
    // ganhou 80: paga os 50 e sobram 30; já pode comprar
    await updateCharacter('u1', { diamantes: 80 });
    await criarPedido('u1', 'diamantes-1', AGORA);
    c = (await getCharacterByUid('u1'))!;
    expect(c.diamantes).toBe(30);
    expect(c.dividaDeDiamantes).toBeUndefined();
  });

  it('o ledger confere: nenhuma moeda mexida sem registro nas compras e no estorno', async () => {
    await ligarLojaVip();
    await comprarNoTeste('u1', 'diamantes-4', AGORA);
    const id = (await getCharacterByUid('u1'))!.pedidosDeCompra![0].id;
    await estornarPedido('u1', id, AGORA);
    const extrato = await repositorio.listarTransacoes('u1', 20);
    const diamantes = extrato.filter((t) => t.moeda === 'diamantes');
    expect(diamantes.map((t) => t.tipo).sort()).toEqual(['ganho', 'perda']);
    expect(diamantes.every((t) => t.motivo.includes('Pacote Grande'))).toBe(true);
  });

  it('o ouro diário do VIP chega pelo Correio uma vez por dia, do nível 1 em diante, sem acumular', async () => {
    await mandarOuroDoVip('u1', AGORA);
    expect((await estadoDoCorreio('u1', AGORA)).mensagens).toHaveLength(0); // VIP 0: nada
    await updateCharacter('u1', { gastoReal: 1_000 });
    limparCacheDoCorreio();
    let e = await estadoDoCorreio('u1', AGORA);
    expect(e.mensagens.filter((m) => m.titulo.startsWith('Recompensa diária VIP'))).toHaveLength(1);
    e = await estadoDoCorreio('u1', AGORA);
    expect(e.mensagens.filter((m) => m.titulo.startsWith('Recompensa diária VIP'))).toHaveLength(1); // mesmo dia: não repete
    const amanha = new Date(AGORA.getTime() + 86_400_000);
    const depois = new Date(AGORA.getTime() + 5 * 86_400_000); // 4 dias sem abrir: só entra o de hoje
    await estadoDoCorreio('u1', amanha);
    e = await estadoDoCorreio('u1', depois);
    expect(e.mensagens.filter((m) => m.titulo.startsWith('Recompensa diária VIP'))).toHaveLength(3);
    const antes = (await getCharacterByUid('u1'))!.ouro;
    await agirNoCorreio('u1', 'resgatarTudo', {}, depois);
    expect((await getCharacterByUid('u1'))!.ouro).toBe(antes + 3 * 500);
  });

  it('o bônus de XP e ouro do VIP entra nas vitórias contra monstros, só do nível atual', async () => {
    const resultado = (): ResultadoCombate =>
      ({ vencedor: 'personagem', logTurnos: [], mensagens: [], xpGanho: 20, ouroGanho: 100, ouroPerdido: 0, personagemFinal: { hp: 10, hpMax: 10, ouro: 0 } }) as unknown as ResultadoCombate;
    await updateCharacter('u1', { ouro: 0, xpAtual: 0 });
    const sem = await applyCombatResult('u1', resultado(), 'Rato');
    expect(sem.character.ouro).toBe(100);
    expect(sem.character.xpAtual).toBe(20);
    await updateCharacter('u1', { ouro: 0, xpAtual: 0, gastoReal: 300_000 }); // VIP 10: +15% XP, +30% ouro
    const com = await applyCombatResult('u1', resultado(), 'Rato');
    expect(com.character.ouro).toBe(130);
    expect(com.character.xpAtual).toBe(23);
    expect(com.mensagens.join(' ')).toMatch(/VIP: \+3 XP e \+30 de ouro/);
    // derrota não ganha nada
    await updateCharacter('u1', { ouro: 100, xpAtual: 0 });
    const perdeu = await applyCombatResult('u1', { ...resultado(), vencedor: 'monstro' }, 'Rato');
    expect(perdeu.character.xpAtual).toBe(0);
  });

  it('o Mestre vê os pedidos; só o Dono estorna, com motivo, e fica no log', async () => {
    await ligarLojaVip();
    await comprarNoTeste('u1', 'diamantes-1', AGORA);
    const id = (await getCharacterByUid('u1'))!.pedidosDeCompra![0].id;
    const ver = await comprasDoJogadorNoPainel(suporte, 'u1');
    expect(ver).toMatchObject({ nome: 'Aldric', diamantes: 200, pedidos: [{ id, estado: 'pago' }] });
    expect(await erro(estornarComoMestre(suporte, { uid: 'u1', pedido: id, motivo: 'chargeback no cartão' }))).toMatchObject({ status: 403 });
    expect(await erro(estornarComoMestre(dono, { uid: 'u1', pedido: id }))).toMatchObject({ status: 400 });
    expect(await erro(estornarComoMestre(dono, { uid: 'u1', pedido: 'ped_x', motivo: 'chargeback no cartão' }))).toMatchObject({ status: 404 });
    const r = await estornarComoMestre(dono, { uid: 'u1', pedido: id, motivo: 'chargeback no cartão' }, '200.1.2.3');
    expect(r.mensagem).toMatch(/estornado/i);
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(0);
    const log = await repositorio.listarLogAdmin(5);
    expect(log.find((l) => l.acao === 'compra.estornar')).toMatchObject({ alvo: 'u1', motivo: 'chargeback no cartão' });
    expect((await estornarComoMestre(dono, { uid: 'u1', pedido: id, motivo: 'de novo por engano' })).mensagem).toMatch(/já estava estornado/);
  });

  it('as rotas exigem login; a do Mestre exige papel', async () => {
    await ligarLojaVip();
    const req = (uid: string | null, url = 'http://t/api/compras', corpo?: unknown) =>
      new NextRequest(url, { method: corpo ? 'POST' : 'GET', headers: { ...(uid ? { authorization: `Bearer ${tokenDeTeste(uid)}` } : {}), 'content-type': 'application/json' }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) });
    expect((await comprasGet(req(null))).status).toBe(401);
    expect((await comprasPost(req(null, 'http://t/api/compras', { produto: 'diamantes-1' }))).status).toBe(401);
    const ok = await comprasGet(req('u1'));
    expect(ok.status).toBe(200);
    expect((await ok.json()).vip.nivel).toBe(0);
    expect((await comprasPost(req('u1', 'http://t/api/compras', { produto: 'diamantes-1' }))).status).toBe(200);
    expect((await comprasPost(req('u1', 'http://t/api/compras', { produto: 'nao-existe' }))).status).toBe(400);
    expect((await mestreGet(req('u1', 'http://t/api/mestre/compras?uid=u1'))).status).toBe(403);
    expect((await mestreGet(req('dono1', 'http://t/api/mestre/compras?uid=u1'))).status).toBe(200);
    expect((await mestrePost(req('u1', 'http://t/api/mestre/compras', { uid: 'u1', pedido: 'x', motivo: 'teste teste' }))).status).toBe(403);
  });
});
