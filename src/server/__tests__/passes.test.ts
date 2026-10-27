import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ResultadoCombate } from '@/game/combat';
import { limparCacheRevogacao } from '@/server/auth';
import { applyCombatResult, createCharacter, fabricarArma, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { comprarNoTeste, estadoDaLojaVip, estornarPedido } from '@/server/compras';
import { agirNoCorreio, estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { comprarNaLoja, estadoDaLoja } from '@/server/loja';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { configuracaoPadrao } from '@/rules/sistemas';
import { resetCharacterStore } from '@/test/repositorioMemoria';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as { message: string });
const DIA1 = new Date('2026-10-27T15:00:00.000Z'); // 12h de Brasília
const diaDepois = (n: number) => new Date(DIA1.getTime() + n * 86_400_000);
const entregasDo = async (uid: string, agora: Date, passe: string) => (await estadoDoCorreio(uid, agora)).mensagens.filter((m) => m.titulo === `${passe}: entrega diária`);

describe('Passes (8.5): servidor', () => {
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
    await updateCharacter('u1', { nivel: 5, ouro: 100_000, diamantes: 0 });
  });
  afterEach(() => {
    delete process.env.PAGAMENTOS_MODO;
  });

  it('comprar o Passe ativa 30 dias, conta no VIP e já manda a entrega de hoje pelo Correio (sem creditar nada sozinho)', async () => {
    const r = await comprarNoTeste('u1', 'passe-premium', DIA1);
    expect(r.nome).toBe('Passe Premium');
    expect(r.recebido[0]).toMatch(/Passe Premium ativo por 30 dias a mais \(até 25\/11\/2026\)/);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.passes).toEqual({ premium: { inicio: '2026-10-27', fim: '2026-11-25', entregueAte: '2026-10-27' } });
    expect(c.gastoReal).toBe(1_999);
    expect(c.pedidosDeCompra![0]).toMatchObject({ estado: 'pago', passe: { id: 'premium', desde: '2026-10-27', ate: '2026-11-25' } });
    expect(c.moedasVip ?? 0).toBe(0);
    const entrega = await entregasDo('u1', DIA1, 'Passe Premium');
    expect(entrega).toHaveLength(1);
    expect(entrega[0].presente).toEqual({ avancosDeExpedicao: 4, moedasVip: 10 });
    await agirNoCorreio('u1', 'resgatar', { id: entrega[0].id }, DIA1);
    const d = (await getCharacterByUid('u1'))!;
    expect(d.moedasVip).toBe(10);
    expect(d.avancosDeExpedicao).toBe(4);
    const estado = await estadoDaLojaVip('u1', DIA1);
    expect(estado.passes.find((p) => p.id === 'premium')).toMatchObject({ diasRestantes: 30, fim: '2026-11-25' });
    expect(estado.bonusDosPasses).toEqual({ xp: 10, ouro: 15, desconto: 5 });
    expect(estado.moedasVip).toBe(10);
  });

  it('uma entrega por dia ao abrir o Correio; dias sem abrir chegam numa mensagem só; acaba nos 30 dias', async () => {
    await comprarNoTeste('u1', 'passe-diamantes', DIA1);
    expect(await entregasDo('u1', DIA1, 'Passe de Diamantes')).toHaveLength(1);
    expect(await entregasDo('u1', DIA1, 'Passe de Diamantes')).toHaveLength(1); // mesmo dia: não repete
    expect(await entregasDo('u1', diaDepois(1), 'Passe de Diamantes')).toHaveLength(2);
    const aposAusencia = await entregasDo('u1', diaDepois(5), 'Passe de Diamantes'); // 4 dias sem abrir
    expect(aposAusencia).toHaveLength(3);
    expect(aposAusencia[0].texto).toMatch(/4 dias/);
    expect(aposAusencia[0].presente).toEqual({ diamantes: 80 });
    // no último dia do Passe (o 30º) já chegaram os 30 dias: 600 Diamantes; depois disso não chega mais nada
    const ultimas = await entregasDo('u1', diaDepois(29), 'Passe de Diamantes');
    expect(ultimas.reduce((s, m) => s + (m.presente?.diamantes ?? 0), 0)).toBe(600);
    await agirNoCorreio('u1', 'resgatarTudo', {}, diaDepois(29));
    expect((await getCharacterByUid('u1'))!.diamantes).toBe(600);
    const depois = await entregasDo('u1', diaDepois(31), 'Passe de Diamantes');
    expect(depois.every((m) => m.resgatada)).toBe(true);
    const idsAntes = new Set(ultimas.map((m) => m.id));
    expect(depois.every((m) => idsAntes.has(m.id))).toBe(true); // nenhuma entrega nova depois do 30º dia
  });

  it('Premium e Deluxe juntos somam as Moedas VIP e os Avanços, mas o bônus de XP e ouro vale o maior e soma com o VIP', async () => {
    await comprarNoTeste('u1', 'passe-premium', DIA1);
    await comprarNoTeste('u1', 'passe-deluxe', DIA1);
    await agirNoCorreio('u1', 'resgatarTudo', {}, DIA1);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.moedasVip).toBe(30);
    expect(c.avancosDeExpedicao).toBe(12);
    expect(c.selosDeBusca).toEqual({ encantado: 10 });
    // VIP: R$ 19,99 + R$ 49,99 = R$ 69,99 => VIP 2 (+3% XP, +3% ouro); Passe Deluxe (o maior): +20% e +25%
    const resultado = { vencedor: 'personagem', logTurnos: [], mensagens: [], xpGanho: 100, ouroGanho: 100, ouroPerdido: 0, personagemFinal: { hp: 10, hpMax: 10, ouro: 0 } } as unknown as ResultadoCombate;
    await updateCharacter('u1', { ouro: 0, xpAtual: 0, nivel: 1 });
    const r = await applyCombatResult('u1', resultado, 'Rato');
    expect(r.character.ouro).toBe(100 + 3 + 25);
    expect(r.mensagens.join(' ')).toMatch(/VIP e Passe: \+23 XP e \+28 de ouro/);
  });

  it('o desconto do Passe vale na Loja (preço e cobrança) e na Forja', async () => {
    const semPasse = (await estadoDaLoja('u1', DIA1)).produtos.find((p) => p.moeda === 'ouro' && p.tipo === 'recurso')!;
    await comprarNoTeste('u1', 'passe-deluxe', DIA1);
    const com = await estadoDaLoja('u1', DIA1);
    expect(com.descontoDoPasse).toBe(10);
    const produto = com.produtos.find((p) => p.chave === semPasse.chave)!;
    expect(produto.preco).toBe(Math.floor(semPasse.preco * 0.9));
    const antes = (await getCharacterByUid('u1'))!.ouro;
    await comprarNaLoja('u1', produto.chave, 2, undefined, DIA1);
    expect(antes - (await getCharacterByUid('u1'))!.ouro).toBe(produto.preco * 2);
    // Forja: Ferro de Caçada custa 100 de ouro; com o Passe Deluxe, 90
    await updateCharacter('u1', { ouro: 1_000, inventario: { 'pelo-de-rato': 6, 'mundo-osso-bruto': 2, 'mundo-minerio-de-ferro-bruto': 2, 'mundo-fibra-silvestre': 1 } });
    const fab = await fabricarArma('u1', { baseId: 'ferro-de-cacada', categoria: 'espadaGrande' });
    expect(fab.character.ouro).toBe(910);
  });

  it('o Passe do Invocador entrega os selos e não dá bônus de XP nem de ouro', async () => {
    await comprarNoTeste('u1', 'passe-invocador', DIA1);
    const [msg] = await entregasDo('u1', DIA1, 'Passe do Invocador');
    expect(msg.presente).toEqual({ selos: { desgastado: 20, encantado: 20, eternidade: 10, origem: 5 } });
    expect((await estadoDaLojaVip('u1', DIA1)).bonusDosPasses).toEqual({ xp: 0, ouro: 0, desconto: 0 });
  });

  it('comprar de novo soma 30 dias e a segunda compra não repete a entrega de hoje', async () => {
    await comprarNoTeste('u1', 'passe-premium', DIA1);
    await comprarNoTeste('u1', 'passe-premium', DIA1);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.passes!.premium).toMatchObject({ inicio: '2026-10-27', fim: '2026-12-25' });
    expect(await entregasDo('u1', DIA1, 'Passe Premium')).toHaveLength(1);
    expect(c.pedidosDeCompra![1].passe).toEqual({ id: 'premium', desde: '2026-11-26', ate: '2026-12-25' });
    expect(c.gastoReal).toBe(3_998);
  });

  it('o estorno cancela os 30 dias, apaga a entrega parada, retira o que sobrou e desconta do VIP', async () => {
    await comprarNoTeste('u1', 'passe-premium', DIA1);
    await entregasDo('u1', diaDepois(2), 'Passe Premium'); // dias 1 a 3 entregues
    const c1 = (await getCharacterByUid('u1'))!;
    const parada = (await estadoDoCorreio('u1', diaDepois(2))).mensagens.filter((m) => m.titulo === 'Passe Premium: entrega diária');
    expect(parada).toHaveLength(2);
    // resgatou a primeira (10 moedas e 4 avanços) e gastou 6 moedas
    await agirNoCorreio('u1', 'resgatar', { id: parada[parada.length - 1].id }, diaDepois(2));
    await updateCharacter('u1', { moedasVip: 4 });
    const id = c1.pedidosDeCompra![0].id;
    const r = await estornarPedido('u1', id, diaDepois(2));
    // dias entregues: 3 (12 avanços, 30 moedas). Parada no Correio: 2 dias... a mensagem de 2 dias some
    expect(r.naoRecuperado.join(' ')).toMatch(/Moedas VIP/);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.passes).toBeUndefined();
    expect(c.gastoReal).toBeUndefined();
    expect(c.moedasVip ?? 0).toBe(0);
    expect(c.avancosDeExpedicao ?? 0).toBe(0);
    expect((await estadoDoCorreio('u1', diaDepois(2))).mensagens.filter((m) => m.titulo === 'Passe Premium: entrega diária' && !m.resgatada)).toHaveLength(0);
    expect((await estornarPedido('u1', id, diaDepois(2))).jaEstavaEstornado).toBe(true);
    expect(await erro(estadoDoCorreio('u1', diaDepois(40)))).toBeNull(); // sem Passe, nada novo chega
    expect((await getCharacterByUid('u1'))!.passes).toBeUndefined();
  });

  it('estornar a renovação tira só os 30 dias dela', async () => {
    await comprarNoTeste('u1', 'passe-diamantes', DIA1);
    await comprarNoTeste('u1', 'passe-diamantes', DIA1);
    const [, segundo] = (await getCharacterByUid('u1'))!.pedidosDeCompra!;
    await estornarPedido('u1', segundo.id, DIA1);
    const c = (await getCharacterByUid('u1'))!;
    expect(c.passes!.diamantes).toMatchObject({ inicio: '2026-10-27', fim: '2026-11-25' });
    expect(c.gastoReal).toBe(1_999);
  });
});
