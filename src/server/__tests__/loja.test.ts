import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as lojaGet } from '@/app/api/loja/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { comprarNaLoja, ErroDaLoja, estadoDaLoja } from '@/server/loja';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { CARTAS_EPICAS, catalogoDaSemana, EMBLEMAS_EPICOS, mesDeBrasilia } from '@/rules/loja';
import { CARTAS_MAXIMAS } from '@/rules/almas';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error);
// segunda-feira, 26/10/2026, 12h de Brasília
const AGORA = new Date('2026-10-26T15:00:00.000Z');
const SEMANA = '2026-10-26';

describe('Loja (7.2): regras', () => {
  it('o catálogo da semana: 8 materiais, 9 recursos, 6 cartas, 4 emblemas e 5 itens da Essência; nada acima do Épico', () => {
    const c = catalogoDaSemana(SEMANA);
    const por = (aba: string) => c.filter((p) => p.aba === aba);
    expect(por('materiais')).toHaveLength(8);
    expect(por('recursos')).toHaveLength(9);
    expect(por('cartas')).toHaveLength(6);
    expect(por('emblemas')).toHaveLength(4);
    expect(por('essencia')).toHaveLength(5);
    expect(c.every((p) => p.raridade !== 'lendario' && p.raridade !== 'mitico')).toBe(true);
    expect(new Set(c.map((p) => p.chave)).size).toBe(c.length);
    expect(por('essencia').every((p) => p.moeda === 'essenciaDeSoberano')).toBe(true);
    expect(por('cartas').find((p) => p.raridade === 'epico')).toMatchObject({ moeda: 'diamantes', preco: 40, limiteMensal: 2 });
  });

  it('a mesma semana dá o mesmo catálogo; a semana seguinte gira', () => {
    const nomes = (s: string) => catalogoDaSemana(s).filter((p) => p.daSemana).map((p) => p.chave);
    expect(nomes(SEMANA)).toEqual(nomes(SEMANA));
    expect(nomes('2026-11-02')).not.toEqual(nomes(SEMANA));
  });

  it('o mês das compras é o de Brasília', () => {
    expect(mesDeBrasilia(new Date('2026-11-01T02:00:00.000Z'))).toBe('2026-10');
    expect(mesDeBrasilia(new Date('2026-11-01T03:00:00.000Z'))).toBe('2026-11');
  });
});

describe('Loja (7.2): servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    for (const [uid, nome] of [['u1', 'Aldric'], ['u3', 'Novato']]) await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
    await updateCharacter('u1', { nivel: 5, ouro: 100_000, diamantes: 500, essenciaDeSoberano: 1_000 });
  });

  it('compra recurso e material, tira o preço e conta o limite do mês', async () => {
    const e = await estadoDaLoja('u1', AGORA);
    expect(e).toMatchObject({ podeComprar: true, giraEm: '2026-11-02T03:00:00.000Z', saldos: { ouro: 100_000, diamantes: 500, essenciaDeSoberano: 1_000 } });
    const r = await comprarNaLoja('u1', 'recursos:selo:desgastado', 10, undefined, AGORA);
    expect(r.mensagem).toMatch(/10× Selo Desgastado por 2\.000 de ouro/);
    let c = await getCharacterByUid('u1');
    expect(c!.ouro).toBe(98_000);
    expect(c!.selosDeBusca?.desgastado).toBe(10);
    const material = e.produtos.find((p) => p.aba === 'materiais' && p.raridade === 'epico')!;
    await comprarNaLoja('u1', material.chave, 5, undefined, AGORA);
    c = await getCharacterByUid('u1');
    expect(c!.inventario?.[material.id]).toBe(5);
    expect(c!.ouro).toBe(98_000 - 5 * 1_000);
    expect((await erro(comprarNaLoja('u1', material.chave, 1, undefined, AGORA)))?.message).toMatch(/limite deste item/);
    expect((await erro(comprarNaLoja('u1', 'recursos:selo:desgastado', 41, undefined, AGORA)))?.message).toMatch(/só pode comprar mais 40/);
    const depois = (await estadoDaLoja('u1', AGORA)).produtos.find((p) => p.chave === material.chave)!;
    expect(depois).toMatchObject({ comprados: 5, restantes: 0 });
    // no mês seguinte o limite zera
    const dezembro = new Date('2026-12-01T15:00:00.000Z');
    expect((await estadoDaLoja('u1', dezembro)).produtos.find((p) => p.chave === 'recursos:selo:desgastado')).toMatchObject({ comprados: 0, restantes: 50 });
  });

  it('carta e emblema da semana; a carta que não cabe vai pelo Correio', async () => {
    const e = await estadoDaLoja('u1', AGORA);
    const emblema = e.produtos.find((p) => p.aba === 'emblemas' && p.raridade === 'comum')!;
    await comprarNaLoja('u1', emblema.chave, 1, undefined, AGORA);
    expect((await getCharacterByUid('u1'))!.emblemasItens?.some((x) => x.tipo === emblema.id && x.estrelas === 1)).toBe(true);
    const carta = e.produtos.find((p) => p.aba === 'cartas' && p.raridade === 'comum')!;
    const cheia = Array.from({ length: CARTAS_MAXIMAS }, (_, i) => ({ id: `c${i}`, tipo: carta.id, efeitos: [], despertar: 0 }));
    await updateCharacter('u1', { cartasItens: cheia as never });
    const r = await comprarNaLoja('u1', carta.chave, 1, undefined, AGORA);
    expect(r.mensagem).toMatch(/Correio/);
    expect((await getCharacterByUid('u1'))!.cartasItens).toHaveLength(CARTAS_MAXIMAS);
    const msg = (await estadoDoCorreio('u1', AGORA)).mensagens.find((m) => m.de === 'Loja')!;
    expect(msg.presente?.cartas?.[0]?.tipo).toBe(carta.id);
  });

  it('Essência de Soberano: baú de escolha entrega a carta épica escolhida', async () => {
    expect((await erro(comprarNaLoja('u1', 'essencia:escolhaCarta', 1, 'nao-existe', AGORA)))?.message).toMatch(/Escolha a carta épica/);
    const escolhida = CARTAS_EPICAS[0].id;
    await comprarNaLoja('u1', 'essencia:escolhaCarta', 1, escolhida, AGORA);
    const c = await getCharacterByUid('u1');
    expect(c!.essenciaDeSoberano).toBe(700);
    expect(c!.cartasItens?.some((x) => x.tipo === escolhida)).toBe(true);
    await comprarNaLoja('u1', 'essencia:escolhaEmblema', 1, EMBLEMAS_EPICOS[0].id, AGORA);
    expect((await getCharacterByUid('u1'))!.emblemasItens?.some((x) => x.tipo === EMBLEMAS_EPICOS[0].id)).toBe(true);
    expect((await erro(comprarNaLoja('u1', 'essencia:escolhaCarta', 1, escolhida, AGORA)))?.message).toMatch(/limite/);
  });

  it('nível 2, saldo, item de outra semana e quantidade inválida', async () => {
    expect((await erro(comprarNaLoja('u3', 'recursos:selo:desgastado', 1, undefined, AGORA)))?.message).toMatch(/nível 2/);
    await updateCharacter('u1', { diamantes: 0 });
    expect((await erro(comprarNaLoja('u1', 'recursos:pedrasDaRecordacao', 1, undefined, AGORA)))?.message).toMatch(/insuficiente/i);
    expect(await erro(comprarNaLoja('u1', 'cartas:nao-existe', 1, undefined, AGORA))).toBeInstanceOf(ErroDaLoja);
    expect((await erro(comprarNaLoja('u1', 'recursos:selo:desgastado', 0, undefined, AGORA)))?.message).toMatch(/Quantidade inválida/);
    expect((await getCharacterByUid('u1'))!.ouro).toBe(100_000);
  });

  it('rota com login', async () => {
    expect((await lojaGet(new NextRequest('http://t/api/loja'))).status).toBe(401);
    const r = await lojaGet(new NextRequest('http://t/api/loja', { headers: { authorization: `Bearer ${tokenDeTeste('u1')}` } }));
    expect(r.status).toBe(200);
  });
});
