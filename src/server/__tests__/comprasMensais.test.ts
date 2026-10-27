import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as comprasPost } from '@/app/api/compras/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { comprarNoTeste, confirmarPagamento, criarPedido, estadoDaLojaVip, estornarPedido } from '@/server/compras';
import { limparCacheDoCorreio } from '@/server/correio';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { configuracaoPadrao } from '@/rules/sistemas';
import { CADEIAS_MENSAIS, comCompraMensal, comprasMensaisDoDocumento, feitasNoMes, PACOTES_MENSAIS, pacotesDaCadeia, proximoPacoteDaCadeia } from '@/rules/compras';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as { message: string });
const OUTUBRO = new Date('2026-10-27T15:00:00.000Z');
const NOVEMBRO = new Date('2026-11-01T15:00:00.000Z');
const ultimoDeOutubro = new Date('2026-11-01T02:30:00.000Z'); // 23h30 de 31/10 em Brasília

describe('Pacotes mensais (8.5): regras', () => {
  it('são 3 cadeias de 4 pacotes, com os valores do Yuri', () => {
    expect(CADEIAS_MENSAIS).toEqual(['colecao', 'ouro', 'expedicao']);
    expect(PACOTES_MENSAIS).toHaveLength(12);
    for (const c of CADEIAS_MENSAIS) expect(pacotesDaCadeia(c).map((p) => p.precoCentavos / 100)).toEqual([4.99, 29.99, 59.99, 99.99]);
    expect(pacotesDaCadeia('ouro').map((p) => p.entrega.ouro)).toEqual([1_000, 5_000, 12_000, 30_000]);
    expect(pacotesDaCadeia('expedicao').map((p) => p.entrega.avancosDeExpedicao)).toEqual([8, 24, 56, 128]);
    expect(pacotesDaCadeia('colecao').map((p) => p.entrega.selos)).toEqual([
      { desgastado: 50, encantado: 40 },
      { encantado: 50, eternidade: 40 },
      { eternidade: 50, origem: 40 },
      { eternidade: 100, origem: 100 },
    ]);
  });

  it('a cadeia anda em ordem e reinicia no dia 1 do mês (Brasília)', () => {
    let c = undefined as ReturnType<typeof comCompraMensal> | undefined;
    expect(proximoPacoteDaCadeia(c, 'ouro', OUTUBRO)?.id).toBe('ouro-1');
    c = comCompraMensal(c, pacotesDaCadeia('ouro')[0], OUTUBRO);
    expect(proximoPacoteDaCadeia(c, 'ouro', OUTUBRO)?.id).toBe('ouro-2');
    expect(proximoPacoteDaCadeia(c, 'colecao', OUTUBRO)?.id).toBe('colecao-1'); // outra cadeia, outro andamento
    for (const p of pacotesDaCadeia('ouro').slice(1)) c = comCompraMensal(c, p, OUTUBRO);
    expect(proximoPacoteDaCadeia(c, 'ouro', OUTUBRO)).toBeNull();
    expect(feitasNoMes(c, 'ouro', ultimoDeOutubro)).toBe(4); // ainda é outubro em Brasília
    expect(feitasNoMes(c, 'ouro', NOVEMBRO)).toBe(0);
    expect(proximoPacoteDaCadeia(c, 'ouro', NOVEMBRO)?.id).toBe('ouro-1');
    // comprar no mês novo começa do zero e não mistura com o mês velho
    expect(comCompraMensal(c, pacotesDaCadeia('ouro')[0], NOVEMBRO)).toEqual({ mes: '2026-11', feitas: { ouro: 1 } });
  });

  it('o documento gravado é lido com tolerância', () => {
    expect(comprasMensaisDoDocumento({ mes: '2026-10', feitas: { ouro: 2, colecao: 9, lixo: 3, expedicao: -1 } })).toEqual({ mes: '2026-10', feitas: { ouro: 2, colecao: 4 } });
    expect(comprasMensaisDoDocumento({ mes: 'x', feitas: { ouro: 1 } })).toBeUndefined();
    expect(comprasMensaisDoDocumento(null)).toBeUndefined();
    expect(comprasMensaisDoDocumento({ mes: '2026-10', feitas: {} })).toBeUndefined();
  });
});

describe('Pacotes mensais (8.5): compra e estorno', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.PAGAMENTOS_MODO = 'teste';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    const c = configuracaoPadrao();
    c.sistemas.lojaVip = { ativo: true, mensagem: '' };
    await repositorio.gravarConfiguracaoDeSistemas(c);
    limparCacheDeSistemas();
    await createCharacter('u1', { nome: 'Aldric', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 5, ouro: 100, diamantes: 0 });
  });
  afterEach(() => {
    delete process.env.PAGAMENTOS_MODO;
  });

  it('o pacote de ouro entra na conta na hora, com extrato, recibo no Correio e o que chegou para o pop-up', async () => {
    const r = await comprarNoTeste('u1', 'ouro-1', OUTUBRO);
    expect(r).toMatchObject({ nome: 'Pacote Ouro I', recebido: ['1.000 de ouro'] });
    const c = (await getCharacterByUid('u1'))!;
    expect(c.ouro).toBe(1_100);
    expect(c.gastoReal).toBe(499);
    expect(c.comprasMensais).toEqual({ mes: '2026-10', feitas: { ouro: 1 } });
    expect(c.pedidosDeCompra![0]).toMatchObject({ estado: 'pago', produto: 'ouro-1', entrega: { ouro: 1_000 }, valorCentavos: 499 });
    expect(c.correio?.some((m) => m.titulo === 'Compra confirmada' && m.texto.includes('1.000 de ouro'))).toBe(true);
    const extrato = await repositorio.listarTransacoes('u1', 10);
    expect(extrato.find((t) => t.moeda === 'ouro' && t.quantidade === 1_000)).toMatchObject({ tipo: 'ganho', motivo: 'Compra: Pacote Ouro I' });
    expect(c.primeiraCompraFeita).toBeUndefined(); // a primeira compra em dobro é só dos Diamantes
  });

  it('a Coleção entrega selos e a Expedição, Avanços', async () => {
    await comprarNoTeste('u1', 'colecao-1', OUTUBRO);
    await comprarNoTeste('u1', 'expedicao-1', OUTUBRO);
    await comprarNoTeste('u1', 'colecao-2', OUTUBRO);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.selosDeBusca).toEqual({ desgastado: 50, encantado: 90, eternidade: 40 });
    expect(c.avancosDeExpedicao).toBe(8);
    expect(c.gastoReal).toBe(499 + 499 + 2_999);
    expect((await comprarNoTeste('u1', 'colecao-3', OUTUBRO)).recebido).toEqual(['50× Selo da Eternidade', '40× Selo da Origem']);
  });

  it('só se compra o próximo da cadeia, uma vez por mês', async () => {
    expect(await erro(criarPedido('u1', 'ouro-2', OUTUBRO))).toMatchObject({ message: 'Compre antes o Ouro I: cada pacote só aparece depois do anterior.' });
    for (const id of ['ouro-1', 'ouro-2', 'ouro-3', 'ouro-4']) await comprarNoTeste('u1', id, OUTUBRO);
    expect(await erro(criarPedido('u1', 'ouro-1', OUTUBRO))).toMatchObject({ message: expect.stringMatching(/já comprou os 4 pacotes de Ouro deste mês/) });
    expect((await getCharacterByUid('u1'))!.ouro).toBe(100 + 1_000 + 5_000 + 12_000 + 30_000);
    // no mês seguinte volta ao primeiro
    expect((await comprarNoTeste('u1', 'ouro-1', NOVEMBRO)).recebido).toEqual(['1.000 de ouro']);
    expect((await getCharacterByUid('u1'))!.comprasMensais).toEqual({ mes: '2026-11', feitas: { ouro: 1 } });
  });

  it('dois pedidos do mesmo pacote: só o primeiro pagamento entrega', async () => {
    const a = await criarPedido('u1', 'ouro-1', OUTUBRO);
    const b = await criarPedido('u1', 'ouro-1', OUTUBRO);
    await confirmarPagamento('u1', a.id, 'ref_a', OUTUBRO);
    expect(await erro(confirmarPagamento('u1', b.id, 'ref_b', OUTUBRO))).toMatchObject({ message: expect.stringMatching(/Compre antes o Ouro II/) });
    const c = (await getCharacterByUid('u1'))!;
    expect(c.ouro).toBe(1_100);
    expect(c.gastoReal).toBe(499);
    // pagar o mesmo pedido de novo também não repete
    expect((await confirmarPagamento('u1', a.id, 'ref_a', OUTUBRO)).jaEstavaPago).toBe(true);
    expect((await getCharacterByUid('u1'))!.ouro).toBe(1_100);
  });

  it('a tela mostra o que está comprado, o que está disponível e o que está trancado', async () => {
    await comprarNoTeste('u1', 'ouro-1', OUTUBRO);
    const e = await estadoDaLojaVip('u1', OUTUBRO);
    const ouro = e.mensais.find((m) => m.id === 'ouro')!;
    expect(ouro.pacotes.map((p) => p.estado)).toEqual(['comprado', 'disponivel', 'trancado', 'trancado']);
    expect(ouro.pacotes[1].conteudo).toEqual(['5.000 de ouro']);
    expect(e.mensais.find((m) => m.id === 'colecao')!.pacotes.map((p) => p.estado)).toEqual(['disponivel', 'trancado', 'trancado', 'trancado']);
    // no mês seguinte tudo volta ao primeiro
    const dezembro = await estadoDaLojaVip('u1', NOVEMBRO);
    expect(dezembro.mensais.find((m) => m.id === 'ouro')!.pacotes[0].estado).toBe('disponivel');
  });

  it('o estorno tira o que o jogador ainda tem, conta o que não deu e mantém o pacote do mês gasto', async () => {
    await comprarNoTeste('u1', 'colecao-1', OUTUBRO); // 50 Desgastado + 40 Encantado
    await comprarNoTeste('u1', 'expedicao-1', OUTUBRO); // 8 Avanços
    const [col, exp] = (await getCharacterByUid('u1'))!.pedidosDeCompra!;
    // gastou 30 Desgastados, 30 Encantados e 5 Avanços
    await updateCharacter('u1', { selosDeBusca: { desgastado: 20, encantado: 10 }, avancosDeExpedicao: 3 });
    const r = await estornarPedido('u1', col.id, OUTUBRO);
    expect(r.naoRecuperado).toEqual(['30× Selo Desgastado', '30× Selo Encantado']);
    let c = (await getCharacterByUid('u1'))!;
    expect(c.selosDeBusca ?? {}).toEqual({});
    expect(c.gastoReal).toBe(499);
    const r2 = await estornarPedido('u1', exp.id, OUTUBRO);
    expect(r2.naoRecuperado).toEqual(['5 Avanços de expedição']);
    c = (await getCharacterByUid('u1'))!;
    expect(c.avancosDeExpedicao).toBe(0);
    expect(c.gastoReal).toBeUndefined();
    // a cadeia não volta atrás: o pacote do mês continua comprado
    expect(c.comprasMensais).toEqual({ mes: '2026-10', feitas: { colecao: 1, expedicao: 1 } });
    expect(await erro(criarPedido('u1', 'colecao-1', OUTUBRO))).toBeTruthy();
    expect((await estornarPedido('u1', col.id, OUTUBRO)).jaEstavaEstornado).toBe(true);
  });

  it('o estorno do ouro tira só o que sobrou e o ledger confere', async () => {
    await comprarNoTeste('u1', 'ouro-1', OUTUBRO);
    const id = (await getCharacterByUid('u1'))!.pedidosDeCompra![0].id;
    await updateCharacter('u1', { ouro: 400 });
    const r = await estornarPedido('u1', id, OUTUBRO);
    expect(r.naoRecuperado).toEqual(['600 de ouro']);
    expect((await getCharacterByUid('u1'))!.ouro).toBe(0);
  });

  it('a rota devolve o que chegou para o pop-up', async () => {
    const req = new NextRequest('http://t/api/compras', { method: 'POST', headers: { authorization: `Bearer ${tokenDeTeste('u1')}`, 'content-type': 'application/json' }, body: JSON.stringify({ produto: 'expedicao-1' }) });
    const res = await comprasPost(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ nome: 'Pacote Expedição I', recebido: ['8 Avanços de expedição'] });
  });
});
