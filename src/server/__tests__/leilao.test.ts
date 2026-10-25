import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as leilaoGet } from '@/app/api/leilao/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNoCorreio, estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { darLance, ErroDoLeilao, estadoDoLeilao, limparCacheDoLeilao, sortearLeilao } from '@/server/leilao';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { fimDepoisDoLance, inicioDoItem, LANCE_MINIMO, porPeso, proximoDiaDeLeilao, proximoLance, temLeilao } from '@/rules/leilao';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
// segunda-feira, 26/10/2026: o leilão vai das 19h às 20h de Brasília (22h às 23h UTC)
const DIA = '2026-10-26';
const ANTES = new Date('2026-10-26T15:00:00.000Z');
const NO_PRIMEIRO = new Date('2026-10-26T22:01:00.000Z');

describe('Leilão (7.2): regras', () => {
  it('dias, horários e próximo leilão', () => {
    expect(['2026-10-26', '2026-10-28', '2026-10-30', '2026-10-31', '2026-11-01'].every(temLeilao)).toBe(true);
    expect(['2026-10-27', '2026-10-29'].some(temLeilao)).toBe(false);
    expect(proximoDiaDeLeilao('2026-10-27')).toBe('2026-10-28');
    expect(inicioDoItem(DIA, 0).toISOString()).toBe('2026-10-26T22:00:00.000Z');
    expect(inicioDoItem(DIA, 9).toISOString()).toBe('2026-10-26T22:45:00.000Z');
  });

  it('lance: mínimo, depois +10% arredondado para cima; lance no fim estende 15 segundos', () => {
    expect(proximoLance({ minimo: 300 })).toBe(300);
    expect(proximoLance({ minimo: 300, lance: { uid: 'a', nome: 'A', valor: 333, em: '' } })).toBe(367);
    const fim = '2026-10-26T22:05:00.000Z';
    expect(fimDepoisDoLance(fim, new Date('2026-10-26T22:04:00.000Z'))).toBe(fim);
    expect(fimDepoisDoLance(fim, new Date('2026-10-26T22:04:50.000Z'))).toBe('2026-10-26T22:05:05.000Z');
  });

  it('o sorteio: 10 itens, sem mítico, ouro até Épico e Diamantes no Lendário; o mesmo dia sorteia os mesmos tipos', () => {
    const a = sortearLeilao(DIA);
    expect(a.itens).toHaveLength(10);
    for (const i of a.itens) {
      expect(i.raridade).not.toBe('mitico');
      expect(i.moeda).toBe(i.raridade === 'lendario' ? 'diamantes' : 'ouro');
      expect(i.minimo).toBe(LANCE_MINIMO[i.raridade as keyof typeof LANCE_MINIMO].valor);
      if (i.item.tipo === 'material') expect(i.quantidade).toBe(20);
    }
    expect(sortearLeilao(DIA).itens.map((i) => i.nome)).toEqual(a.itens.map((i) => i.nome));
    expect(porPeso({ a: 1, b: 3 }, 0.1)).toBe('a');
    expect(porPeso({ a: 1, b: 3 }, 0.5)).toBe('b');
  });
});

describe('Leilão (7.2): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    limparCacheDoLeilao();
    for (const [uid, nome] of [['u1', 'Aldric'], ['u2', 'Borin'], ['u3', 'Novato']]) await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 5, ouro: 100_000, diamantes: 500 });
    await updateCharacter('u2', { nivel: 5, ouro: 100_000, diamantes: 500 });
  });

  it('antes das 19h mostra os itens aguardando; em dia sem leilão diz quando é o próximo', async () => {
    const e = await estadoDoLeilao('u1', ANTES);
    expect(e).toMatchObject({ hoje: true, dia: DIA, comecaEm: '2026-10-26T22:00:00.000Z' });
    expect(e.itens.every((i) => i.situacao === 'aguardando')).toBe(true);
    const terca = await estadoDoLeilao('u1', new Date('2026-10-27T15:00:00.000Z'));
    expect(terca).toMatchObject({ hoje: false, dia: '2026-10-28', itens: [] });
    expect((await erro(darLance('u1', 0, 300, ANTES)))?.message).toMatch(/ainda não abriu/);
  });

  it('o lance fica reservado, volta para quem foi coberto e o vencedor recebe o item pelo Correio', async () => {
    const e = await estadoDoLeilao('u1', NO_PRIMEIRO);
    const item = e.itens[0];
    expect(item.situacao).toBe('aberto');
    const moeda = item.moeda;
    const saldo = async (uid: string) => (await getCharacterByUid(uid))![moeda] ?? 0;
    const [s1, s2] = [await saldo('u1'), await saldo('u2')];
    await darLance('u1', 0, item.proximo, NO_PRIMEIRO);
    expect(await saldo('u1')).toBe(s1 - item.proximo);
    expect((await erro(darLance('u1', 0, proximoLance({ minimo: item.proximo, lance: { uid: 'u1', nome: '', valor: item.proximo, em: '' } }), NO_PRIMEIRO)))?.message).toMatch(/já tem o maior lance/);
    // outro lance com o valor velho: recusado, com o valor novo
    expect((await erro(darLance('u2', 0, item.proximo, NO_PRIMEIRO)))?.message).toMatch(/Outro lance chegou antes/);
    const depois = (await estadoDoLeilao('u2', NO_PRIMEIRO)).itens[0];
    expect(depois).toMatchObject({ lance: { nome: 'Aldric', valor: item.proximo }, meu: false });
    await darLance('u2', 0, depois.proximo, NO_PRIMEIRO);
    expect(await saldo('u1')).toBe(s1); // o lance coberto voltou
    expect(await saldo('u2')).toBe(s2 - depois.proximo);
    expect(getTransactionsByUid('u1').at(-1)).toMatchObject({ tipo: 'ganho', motivo: expect.stringMatching(/lance coberto/) });
    // acaba o item: o Borin recebe pelo Correio, e o valor dele não volta
    const fim = new Date(Date.parse(depois.fim) + 1000);
    const encerrado = (await estadoDoLeilao('u1', fim)).itens[0];
    expect(encerrado).toMatchObject({ situacao: 'encerrado', lance: { nome: 'Borin' } });
    const msg = (await estadoDoCorreio('u2', fim)).mensagens.find((m) => m.de === 'Leilão')!;
    expect(msg.texto).toMatch(/Você arrematou/);
    await agirNoCorreio('u2', 'resgatar', { id: msg.id }, fim);
    expect(await saldo('u2')).toBe(s2 - depois.proximo);
    // fechar de novo não manda outra vez
    limparCacheDoLeilao();
    await estadoDoLeilao('u1', fim);
    expect((await estadoDoCorreio('u2', fim)).mensagens.filter((m) => m.de === 'Leilão')).toHaveLength(1);
  });

  it('lance nos últimos segundos estende o item; depois do fim não aceita', async () => {
    const item = (await estadoDoLeilao('u1', NO_PRIMEIRO)).itens[0];
    const quaseNoFim = new Date(Date.parse(item.fim) - 5000);
    await darLance('u1', 0, item.proximo, quaseNoFim);
    const estendido = (await estadoDoLeilao('u1', quaseNoFim)).itens[0];
    expect(Date.parse(estendido.fim)).toBe(quaseNoFim.getTime() + 15_000);
    const tarde = new Date(Date.parse(estendido.fim) + 1);
    expect((await erro(darLance('u2', 0, estendido.proximo, tarde)))?.message).toMatch(/já acabou/);
  });

  it('nível 2, saldo e item inválido', async () => {
    const item = (await estadoDoLeilao('u3', NO_PRIMEIRO)).itens[0];
    expect((await erro(darLance('u3', 0, item.proximo, NO_PRIMEIRO)))?.message).toMatch(/nível 2/);
    await updateCharacter('u2', { ouro: 0, diamantes: 0 });
    expect((await erro(darLance('u2', 0, item.proximo, NO_PRIMEIRO)))?.message).toMatch(/insuficiente/i);
    expect(await erro(darLance('u1', 99, 1, NO_PRIMEIRO))).toBeInstanceOf(ErroDoLeilao);
    expect((await erro(darLance('u1', 0, item.proximo, new Date('2026-10-27T22:01:00.000Z'))))?.message).toMatch(/Hoje não tem leilão/);
  });

  it('rota com login', async () => {
    expect((await leilaoGet(new NextRequest('http://t/api/leilao'))).status).toBe(401);
    const r = await leilaoGet(new NextRequest('http://t/api/leilao', { headers: { authorization: `Bearer ${tokenDeTeste('u1')}` } }));
    expect(r.status).toBe(200);
  });
});
