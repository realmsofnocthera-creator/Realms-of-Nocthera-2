import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as colecionaveisGet, POST as colecionaveisPost } from '@/app/api/colecionaveis/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { agirNosColecionaveis, ErroDeColecionavel, estadoDosColecionaveis } from '@/server/colecionaveis';
import { ajustarJogador } from '@/server/jogadores';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { COLECIONAVEL_MAP, custoDoReforco } from '@/rules/colecionaveis';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as ErroDeColecionavel);
const req = (uid: string, corpo?: unknown) =>
  new NextRequest('http://t/api/colecionaveis', { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };

describe('Buscar e Colecionáveis: servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    await createCharacter('u1', { nome: 'Aragorn', racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('busca 10 vezes: gasta 100 selos, a 10ª é a garantia, e os ativados entram nos atributos', async () => {
    await updateCharacter('u1', { selosDeBusca: { desgastado: 105 } });
    const r = await agirNosColecionaveis('u1', 'buscar', { selo: 'desgastado', vezes: 10 }, 1234);
    expect(r.resultados).toHaveLength(10);
    expect(r.resultados![9]).toMatchObject({ garantido: true, raridade: 'comum', inteiro: true });
    expect(r.estado.selos).toEqual({ desgastado: 5 });
    expect(r.estado.garantia).toEqual({});
    const c = (await getCharacterByUid('u1'))!;
    expect(c.selosDeBusca).toEqual({ desgastado: 5 });
    const ativos = Object.entries(c.colecionaveis ?? {}).filter(([, e]) => (e.nivel ?? 0) >= 1);
    expect(ativos.length).toBeGreaterThanOrEqual(1);
    expect((await erro(agirNosColecionaveis('u1', 'buscar', { selo: 'desgastado', vezes: 1 })))?.message).toMatch(/Selos insuficientes/);
    expect((await erro(agirNosColecionaveis('u1', 'buscar', { selo: 'desgastado', vezes: 3 })))?.message).toMatch(/1 ou 10/);
    expect((await erro(agirNosColecionaveis('u1', 'buscar', { selo: 'ouro', vezes: 1 })))?.message).toMatch(/selo/);
  });

  it('ativar, reforçar e subir estrela; a Força do personagem sobe com os colecionáveis', async () => {
    const forca = ['RI-C01', 'RI-C03', 'RI-C05', 'RI-C07'];
    await updateCharacter('u1', {
      colecionaveis: Object.fromEntries(forca.map((id) => [id, { fragmentos: 30 }])),
      fragmentosDeMemoria: 1000,
      pedrasDaRecordacao: 3,
    });
    const antes = (await getCharacterByUid('u1'))!.bonusEquipamento?.forca ?? 0;
    for (const id of forca) await agirNosColecionaveis('u1', 'ativar', { id });
    const depois = (await getCharacterByUid('u1'))!;
    expect(depois.colecionaveis!['RI-C01']).toEqual({ fragmentos: 10, nivel: 1 });
    expect((depois.bonusEquipamento?.forca ?? 0) - antes).toBe(4);
    expect((await erro(agirNosColecionaveis('u1', 'ativar', { id: 'RI-C01' })))?.message).toMatch(/já está ativado/);

    const r = await agirNosColecionaveis('u1', 'reforcar', { id: 'RI-C01', niveis: 4 });
    expect(r.estado.colecionaveis['RI-C01'].nivel).toBe(5);
    expect(r.estado.fragmentosDeMemoria).toBe(1000 - [1, 2, 3, 4].reduce((s, n) => s + custoDoReforco('comum', n), 0));
    expect((await erro(agirNosColecionaveis('u1', 'reforcar', { id: 'RI-C01' })))?.message).toMatch(/limite/);
    const e = await agirNosColecionaveis('u1', 'estrela', { id: 'RI-C01' });
    expect(e.estado.colecionaveis['RI-C01']).toEqual({ fragmentos: 0, nivel: 5, estrelas: 1 });
    expect(e.estado.pedrasDaRecordacao).toBe(2);
    expect((await agirNosColecionaveis('u1', 'reforcar', { id: 'RI-C01' })).estado.colecionaveis['RI-C01'].nivel).toBe(6);
    expect(COLECIONAVEL_MAP['RI-C01'].atributo).toBe('forca');
  });

  it('o Mestre dá selos, Fragmentos de Memória e Pedras da Recordação pelo ajuste, sem deixar saldo negativo', async () => {
    await ajustarJogador(dono, 'u1', { campos: { seloOrigem: 20, seloDesgastado: 30, fragmentosDeMemoria: 500, pedrasDaRecordacao: 7 }, motivo: 'Evento de teste' });
    const e = await estadoDosColecionaveis('u1');
    expect(e).toMatchObject({ selos: { origem: 20, desgastado: 30 }, fragmentosDeMemoria: 500, pedrasDaRecordacao: 7 });
    await expect(ajustarJogador(dono, 'u1', { campos: { seloOrigem: -21 }, motivo: 'Retirada errada' })).rejects.toMatchObject({ status: 400 });
    await ajustarJogador(dono, 'u1', { campos: { seloOrigem: -20, pedrasDaRecordacao: -7 }, motivo: 'Retirada certa' });
    const c = (await getCharacterByUid('u1'))!;
    expect(c.selosDeBusca).toEqual({ desgastado: 30 });
    expect(c.pedrasDaRecordacao).toBeUndefined();
  });

  it('rotas', async () => {
    expect((await colecionaveisGet(new NextRequest('http://t/api/colecionaveis'))).status).toBe(401);
    const g = await colecionaveisGet(req('u1'));
    expect(g.status).toBe(200);
    expect(await g.json()).toEqual({ selos: {}, garantia: {}, fragmentosDeMemoria: 0, pedrasDaRecordacao: 0, colecionaveis: {} });
    expect((await colecionaveisPost(req('u1', { acao: 'voar' }))).status).toBe(400);
    expect((await colecionaveisPost(req('u1', { acao: 'buscar', selo: 'origem', vezes: 1 }))).status).toBe(400);
    await updateCharacter('u1', { selosDeBusca: { origem: 10 } });
    const p = await colecionaveisPost(req('u1', { acao: 'buscar', selo: 'origem', vezes: 1 }));
    expect(p.status).toBe(200);
    const corpo = await p.json();
    expect(corpo.resultados).toHaveLength(1);
    expect(COLECIONAVEL_MAP[corpo.resultados[0].id].raridade).toBe('mitico');
    expect(corpo.estado.selos).toEqual({});
  });
});
