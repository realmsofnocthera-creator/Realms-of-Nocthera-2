import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as mercadoGet, POST as mercadoPost } from '@/app/api/mercado/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNoCorreio, estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { agirNoMercado, estadoDoMercado, ErroDoMercado, limparCacheDoMercado } from '@/server/mercado';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { filaDeRevisao } from '@/server/revisao';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { CARTAS_MAXIMAS, TIPOS_DE_CARTA } from '@/rules/almas';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { TIPOS_EMBLEMA } from '@/rules/emblemasCatalogo';
import { DURACAO_DO_ANUNCIO_MS } from '@/rules/mercado';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
const T0 = new Date('2026-10-25T15:00:00.000Z');
const BASE = Object.keys(ARMAS_BASE_MAP)[0];
const PECA = Object.keys(PECAS_ARMADURA_MAP)[0];
const carta = (id: string, tipo = TIPOS_DE_CARTA[0].id) => ({ id, tipo, efeitos: [], despertar: 0 });
const arma = (id: string) => ({ id, baseId: BASE, categoria: 'lanca', atributo: 'forca', pontos: 12, reforjas: 0, criadaEm: T0.toISOString() });
const pedido = (uid: string, corpo?: unknown, busca = '') =>
  new NextRequest(`http://t/api/mercado${busca}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const anunciar = (uid: string, item: { tipo: string; id: string }, moeda: string, preco: number, quantidade?: number) =>
  agirNoMercado(uid, true, 'anunciar', { item, moeda, preco, quantidade }, T0);
const primeiroAnuncio = async (uid = 'u1') => (await estadoDoMercado(uid, true, {}, T0)).anuncios[0];

describe('Troca entre jogadores (7.2)', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDoMercado();
    for (const [uid, nome] of [['u1', 'Vendedor'], ['u2', 'Comprador'], ['u3', 'Novato']]) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    }
    await updateCharacter('u1', {
      nivel: 20,
      ouro: 100,
      inventario: { 'pelo-de-rato': 30 },
      selosDeBusca: { desgastado: 50 },
      fragmentosAlma: 40,
      cartasItens: [carta('c1'), carta('c2')],
      cartasEquipadas: ['c2'],
      emblemasItens: [{ id: 'e1', tipo: TIPOS_EMBLEMA[0].id, estrelas: 2 }],
      armas: [arma('w1'), arma('w2')] as never,
      equipamento: { armaId: 'w2', armadura: {} },
      armaduras: [{ id: 'p1', pecaId: PECA, atributo: 'vigor', pontos: 5, reforjas: 0, xp: 0, criadaEm: T0.toISOString() }] as never,
      colecionaveis: { 'RI-C01': { fragmentos: 3, nivel: 1 } },
    });
    await updateCharacter('u2', { nivel: 15, ouro: 5000, diamantes: 100 });
    await updateCharacter('u3', { nivel: 9, ouro: 5000 });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('o que dá para vender: sem colecionáveis, moedas e itens equipados', async () => {
    const e = await estadoDoMercado('u1', true, {}, T0);
    const refs = e.vendaveis.map((v) => `${v.ref.tipo}:${v.ref.id}`);
    expect(refs).toEqual(expect.arrayContaining(['material:pelo-de-rato', 'recurso:selo:desgastado', 'recurso:fragmentosAlma', 'carta:c1', 'emblema:e1', 'arma:w1', 'armadura:p1']));
    expect(refs).not.toContain('carta:c2'); // equipada
    expect(refs).not.toContain('arma:w2'); // equipada
    expect(refs.some((r) => r.includes('RI-C01') || r.includes('ouro') || r.includes('diamantes') || r.includes('essenciaDeSoberano'))).toBe(false);
    expect(e.vendaveis.find((v) => v.ref.id === 'pelo-de-rato')).toMatchObject({ quantidade: 30, categoria: 'material' });
  });

  it('anunciar tira o item da mochila; comprar passa o dinheiro e o item, com extrato e aviso no Correio', async () => {
    const r = await anunciar('u1', { tipo: 'arma', id: 'w1' }, 'ouro', 1200);
    expect(r.mensagem).toMatch(/à venda por 1\.200 de ouro, por 7 dias/);
    let vendedor = (await getCharacterByUid('u1'))!;
    expect(vendedor.armas!.map((a) => a.id)).toEqual(['w2']);
    expect(vendedor.anunciosNoMercado).toHaveLength(1);
    const a = await primeiroAnuncio('u2');
    expect(a).toMatchObject({ vendedor: 'Vendedor', categoria: 'arma', moeda: 'ouro', preco: 1200, detalhe: '+12 Força', meu: false });
    const compra = await agirNoMercado('u2', true, 'comprar', { id: a.id }, T0);
    expect(compra.mensagem).toMatch(/Você comprou .+ por 1\.200 de ouro/);
    vendedor = (await getCharacterByUid('u1'))!;
    const comprador = (await getCharacterByUid('u2'))!;
    expect([vendedor.ouro, comprador.ouro]).toEqual([1300, 3800]);
    expect(comprador.armas!.map((x) => x.id)).toEqual(['w1']);
    expect(vendedor.anunciosNoMercado ?? []).toEqual([]);
    expect(getTransactionsByUid('u2').at(-1)).toMatchObject({ moeda: 'ouro', tipo: 'perda', quantidade: 1200, saldoDepois: 3800 });
    expect(getTransactionsByUid('u1').some((t) => t.moeda === 'ouro' && t.tipo === 'ganho' && t.quantidade === 1200)).toBe(true);
    expect((await estadoDoCorreio('u1', T0)).mensagens[0]).toMatchObject({ titulo: 'Venda no Mercado', texto: expect.stringMatching(/Comprador comprou/) });
    expect((await estadoDoMercado('u2', true, {}, T0)).anuncios).toEqual([]);
    expect((await erro(agirNoMercado('u2', true, 'comprar', { id: a.id }, T0)))?.message).toMatch(/não está mais à venda/);
  });

  it('lote de material e recurso: compra o lote inteiro, em Diamantes', async () => {
    await anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'diamantes', 7, 20);
    await anunciar('u1', { tipo: 'recurso', id: 'fragmentosAlma' }, 'diamantes', 3, 15);
    const v = (await getCharacterByUid('u1'))!;
    expect([v.inventario!['pelo-de-rato'], v.fragmentosAlma]).toEqual([10, 25]);
    const e = await estadoDoMercado('u2', true, { categoria: 'material' }, T0);
    expect(e.anuncios.map((x) => [x.nome, x.quantidade, x.preco])).toEqual([[expect.any(String), 20, 7]]);
    await agirNoMercado('u2', true, 'comprar', { id: e.anuncios[0].id }, T0);
    const recurso = (await estadoDoMercado('u2', true, { categoria: 'recurso' }, T0)).anuncios[0];
    await agirNoMercado('u2', true, 'comprar', { id: recurso.id }, T0);
    const c = (await getCharacterByUid('u2'))!;
    expect([c.inventario!['pelo-de-rato'], c.fragmentosAlma, c.diamantes]).toEqual([20, 15, 90]);
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(10);
  });

  it('carta comprada com as cartas cheias: é cobrada e chega pelo Correio', async () => {
    await anunciar('u1', { tipo: 'carta', id: 'c1' }, 'ouro', 500);
    await updateCharacter('u2', { cartasItens: Array.from({ length: CARTAS_MAXIMAS }, (_, i) => carta(`x${i}`)) });
    const a = await primeiroAnuncio('u2');
    const r = await agirNoMercado('u2', true, 'comprar', { id: a.id }, T0);
    expect(r.mensagem).toMatch(/foi para o Correio/);
    expect((await getCharacterByUid('u2'))!.ouro).toBe(4500);
    const correio = await estadoDoCorreio('u2', T0);
    const msg = correio.mensagens.find((m) => m.titulo === 'Compra no Mercado')!;
    expect(msg.presente?.cartas?.map((c) => c.id)).toEqual(['c1']);
    // ainda cheia: o resgate espera espaço
    expect((await erro(agirNoCorreio('u2', 'resgatar', { id: msg.id }, T0)))?.message).toMatch(/cartas estão cheias/);
    await updateCharacter('u2', { cartasItens: [] });
    await agirNoCorreio('u2', 'resgatar', { id: msg.id }, T0);
    expect((await getCharacterByUid('u2'))!.cartasItens!.map((c) => c.id)).toEqual(['c1']);
  });

  it('cancelar devolve o item; depois de 7 dias o anúncio some e o item volta sozinho', async () => {
    await anunciar('u1', { tipo: 'emblema', id: 'e1' }, 'ouro', 10);
    const a = await primeiroAnuncio();
    expect(a.meu).toBe(true);
    expect((await erro(agirNoMercado('u2', true, 'cancelar', { id: a.id }, T0)))?.message).toMatch(/não está mais no Mercado/);
    await agirNoMercado('u1', true, 'cancelar', { id: a.id }, T0);
    expect((await getCharacterByUid('u1'))!.emblemasItens!.map((e) => e.id)).toEqual(['e1']);
    await anunciar('u1', { tipo: 'emblema', id: 'e1' }, 'ouro', 10);
    limparCacheDoMercado();
    const depois = new Date(T0.getTime() + DURACAO_DO_ANUNCIO_MS + 1000);
    expect((await estadoDoMercado('u2', true, {}, depois)).anuncios).toEqual([]);
    const meu = await estadoDoMercado('u1', true, {}, depois);
    expect(meu.meus).toEqual([]);
    const v = (await getCharacterByUid('u1'))!;
    expect(v.emblemasItens!.map((e) => e.id)).toEqual(['e1']);
    expect(v.anunciosNoMercado ?? []).toEqual([]);
  });

  it('regras: nível 10, e-mail confirmado, item equipado, quantidade, preço, saldo e o próprio anúncio', async () => {
    expect((await erro(anunciar('u3', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 1, 1)))?.message).toMatch(/nível 10/);
    expect((await erro(agirNoMercado('u1', false, 'anunciar', { item: { tipo: 'arma', id: 'w1' }, moeda: 'ouro', preco: 5 }, T0)))?.message).toMatch(/Confirme o seu e-mail/);
    expect((await erro(anunciar('u1', { tipo: 'arma', id: 'w2' }, 'ouro', 5)))?.message).toMatch(/Tire o item do equipamento/);
    expect((await erro(anunciar('u1', { tipo: 'carta', id: 'c2' }, 'ouro', 5)))?.message).toMatch(/Tire o item do equipamento/);
    expect((await erro(anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 5, 31)))?.message).toMatch(/só tem 30/);
    expect(await erro(anunciar('u1', { tipo: 'arma', id: 'w1' }, 'essenciaDeSoberano', 5))).toBeInstanceOf(ErroDoMercado);
    expect(await erro(anunciar('u1', { tipo: 'arma', id: 'w1' }, 'ouro', 0))).toBeInstanceOf(ErroDoMercado);
    expect(await erro(anunciar('u1', { tipo: 'arma', id: 'w1' }, 'ouro', 1.5))).toBeInstanceOf(ErroDoMercado);
    await anunciar('u1', { tipo: 'arma', id: 'w1' }, 'diamantes', 500);
    const a = await primeiroAnuncio('u2');
    expect((await erro(agirNoMercado('u1', true, 'comprar', { id: a.id }, T0)))?.message).toMatch(/é seu/);
    expect((await erro(agirNoMercado('u3', true, 'comprar', { id: a.id }, T0)))?.message).toMatch(/nível 10/);
    expect((await erro(agirNoMercado('u2', true, 'comprar', { id: a.id }, T0)))?.message).toMatch(/insuficientes/i);
    // nada mudou
    expect((await getCharacterByUid('u2'))!.diamantes).toBe(100);
  });

  it('no máximo 20 anúncios ativos', async () => {
    for (let i = 0; i < 20; i++) await anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 1, 1);
    expect((await erro(anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 1, 1)))?.message).toMatch(/20 anúncios/);
  });

  it('a fila de revisão é avisada de preço muito fora do normal e de muitas compras do mesmo vendedor', async () => {
    await updateCharacter('u1', { inventario: { 'pelo-de-rato': 100 } });
    for (let i = 0; i < 5; i++) {
      await anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 10, 1);
      await agirNoMercado('u2', true, 'comprar', { id: (await primeiroAnuncio('u2')).id }, T0);
    }
    expect((await filaDeRevisao(dono)).map((r) => r.tipo)).toEqual(['trocaEntreAsMesmasContas']);
    await anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 1000, 1);
    await updateCharacter('u2', { ouro: 5000 });
    await agirNoMercado('u2', true, 'comprar', { id: (await primeiroAnuncio('u2')).id }, T0);
    const fila = await filaDeRevisao(dono);
    expect(fila.map((r) => r.tipo).sort()).toEqual(['precoAtipico', 'trocaEntreAsMesmasContas']);
    expect(fila.find((r) => r.tipo === 'precoAtipico')).toMatchObject({ uid: 'u1', contasDaRede: ['u2'] });
  });

  it('a busca, o filtro e a ordem; rotas com login', async () => {
    await anunciar('u1', { tipo: 'arma', id: 'w1' }, 'ouro', 300);
    await anunciar('u1', { tipo: 'material', id: 'pelo-de-rato' }, 'ouro', 20, 10);
    await anunciar('u1', { tipo: 'emblema', id: 'e1' }, 'ouro', 50);
    const barato = (await estadoDoMercado('u2', true, {}, T0)).anuncios.map((a) => a.categoria);
    expect(barato).toEqual(['material', 'emblema', 'arma']); // por preço por unidade: 2, 50, 300
    expect((await estadoDoMercado('u2', true, { ordem: 'maiorPreco' }, T0)).anuncios[0].categoria).toBe('arma');
    expect((await estadoDoMercado('u2', true, { busca: 'emblema' }, T0)).anuncios.map((a) => a.categoria)).toEqual(['emblema']);
    const g = await mercadoGet(pedido('u2', undefined, '?categoria=arma'));
    expect(g.status).toBe(200);
    expect((await g.json()).anuncios).toHaveLength(1);
    expect((await mercadoPost(pedido('u2', { acao: 'xyz' }))).status).toBe(400);
    expect((await mercadoGet(new NextRequest('http://t/api/mercado'))).status).toBe(401);
  });
});

describe('Correio cheio (7.2)', () => {
  it('passando de 100 mensagens, saem primeiro as sem presente por resgatar', async () => {
    const { comMensagem, novaMensagem } = await import('@/server/correio');
    const agora = new Date('2026-10-25T15:00:00.000Z');
    const presente = novaMensagem({ titulo: 'Chefe Mundial', texto: 'Recompensa', de: 'Chefe Mundial', presente: { ouro: 100 } }, agora);
    let caixa = [presente];
    for (let i = 0; i < 99; i++) caixa = comMensagem(caixa, novaMensagem({ titulo: `Venda ${i}`, texto: 'x', de: 'Mercado' }, agora), agora);
    expect(caixa).toHaveLength(100);
    caixa = comMensagem(caixa, novaMensagem({ titulo: 'Venda nova', texto: 'x', de: 'Mercado' }, agora), agora);
    expect(caixa).toHaveLength(100);
    expect(caixa[0].id).toBe(presente.id); // o presente pendente ficou
    expect(caixa.some((m) => m.titulo === 'Venda 0')).toBe(false); // o aviso mais antigo saiu
    expect(caixa.at(-1)!.titulo).toBe('Venda nova');
  });
});

describe('Mochila cheia de armas (7.2)', () => {
  it('a arma comprada acima do limite é cobrada e chega pelo Correio', async () => {
    const { MAX_ARMAS_POR_PERSONAGEM } = await import('@/game/forja');
    resetCharacterStore();
    limparCacheDoMercado();
    limparCacheDoCorreio();
    for (const [uid, nome] of [['v1', 'Vendedor'], ['c1', 'Comprador']]) await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('v1', { nivel: 20, armas: [arma('w1')] as never });
    await updateCharacter('c1', { nivel: 20, ouro: 1000, armas: Array.from({ length: MAX_ARMAS_POR_PERSONAGEM }, (_, i) => arma(`m${i}`)) as never });
    await agirNoMercado('v1', true, 'anunciar', { item: { tipo: 'arma', id: 'w1' }, moeda: 'ouro', preco: 100 }, T0);
    const a = (await estadoDoMercado('c1', true, {}, T0)).anuncios[0];
    expect((await agirNoMercado('c1', true, 'comprar', { id: a.id }, T0)).mensagem).toMatch(/foi para o Correio/);
    const c = (await getCharacterByUid('c1'))!;
    expect([c.ouro, c.armas!.length]).toEqual([900, MAX_ARMAS_POR_PERSONAGEM]);
    const msg = (await estadoDoCorreio('c1', T0)).mensagens.find((m) => m.titulo === 'Compra no Mercado')!;
    expect(msg.presente?.armas?.map((x) => x.id)).toEqual(['w1']);
    expect((await erro(agirNoCorreio('c1', 'resgatar', { id: msg.id }, T0)))?.message).toMatch(/armas estão cheias/);
  });
});
