import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as correioGet, POST as correioPost } from '@/app/api/correio/route';
import { GET as chefeGet, POST as chefePost } from '@/app/api/chefe-mundial/route';
import { POST as mestreCorreioPost } from '@/app/api/mestre/correio/route';
import { limparCacheRevogacao } from '@/server/auth';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { estadoDoChefeMundial, ErroDoChefeMundial, lutarChefeMundial } from '@/server/chefeMundial';
import { agirNoCorreio, enviarMensagemDoMestre, estadoDoCorreio, limparCacheDoCorreio } from '@/server/correio';
import { DONOS_DO_PROJETO, type SessaoMestre } from '@/server/mestre';
import { repositorio } from '@/server/persistencia';
import { limparCacheDeSancoes } from '@/server/sancoes';
import { limparCacheDeSistemas } from '@/server/sistemasLeitura';
import { getTransactionsByUid, resetCharacterStore } from '@/test/repositorioMemoria';
import { tokenDeTeste } from '@/test/firebaseAdminMock';

const PONTOS = { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 };
const FORTE = { vigor: 300, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 };
const erro = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as Error & { status?: number });
const req = (url: string, uid: string, corpo?: unknown) =>
  new NextRequest(`http://t${url}`, { method: corpo ? 'POST' : 'GET', headers: { authorization: `Bearer ${tokenDeTeste(uid)}`, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
const dono: SessaoMestre = { uid: 'dono1', email: 'dono1@test.com', papel: 'dono', origem: 'ambiente' };
// 22/10/2026 às 15h de Brasília; o dia seguinte começa à meia-noite de Brasília (03:00 UTC)
const HOJE = new Date('2026-10-22T18:00:00.000Z');
const AMANHA = new Date('2026-10-23T12:00:00.000Z');

describe('Correio e Chefe Mundial: servidor', () => {
  beforeEach(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    (DONOS_DO_PROJETO as string[]).length = 0;
    process.env.MESTRE_DONO_UIDS = 'dono1';
    resetCharacterStore();
    limparCacheRevogacao();
    limparCacheDeSancoes();
    limparCacheDeSistemas();
    limparCacheDoCorreio();
    for (const [uid, nome] of [['u1', 'Aragorn'], ['u2', 'Boromir'], ['u3', 'Celeborn']]) {
      await createCharacter(uid, { nome, racaId: 'elfo', classeId: 'cavaleiro', pontos: PONTOS });
      await updateCharacter(uid, { nivel: 18, atributos: FORTE });
    }
  });
  afterEach(() => {
    delete process.env.MESTRE_DONO_UIDS;
  });

  it('Chefe Mundial: nível 18; guarda o maior dano do dia; ranking e posição', async () => {
    await updateCharacter('u3', { nivel: 17 });
    expect((await erro(lutarChefeMundial('u3', 1, HOJE)))?.message).toMatch(/nível 18/);
    expect(await erro(lutarChefeMundial('u3', 1, HOJE))).toBeInstanceOf(ErroDoChefeMundial);
    const a = await lutarChefeMundial('u1', 11, HOJE);
    expect(a.dano).toBeGreaterThan(0);
    await lutarChefeMundial('u1', 12, HOJE);
    const entrada = (await repositorio.lerEntradaChefeMundial('2026-10-22', 'u1'))!;
    expect(entrada.dano).toBeGreaterThanOrEqual(a.dano);
    await updateCharacter('u2', { atributos: { ...FORTE, forca: 30 } });
    await lutarChefeMundial('u2', 13, HOJE);
    const e = await estadoDoChefeMundial('u2', HOJE);
    expect(e).toMatchObject({ dia: '2026-10-22', nivelNecessario: 18, minhaPosicao: 2 });
    expect(e.ranking.map((r) => r.nome)).toEqual(['Aragorn', 'Boromir']);
    expect(e.fechaEm).toBe('2026-10-23T03:00:00.000Z');
    expect((await getCharacterByUid('u1'))!.chefeMundial).toEqual([{ dia: '2026-10-22' }]);
  });

  it('quando o dia fecha, a recompensa da faixa chega pelo Correio uma vez só; resgatar entrega com extrato', async () => {
    await lutarChefeMundial('u1', 11, HOJE);
    await updateCharacter('u2', { atributos: { ...FORTE, forca: 30 } });
    await lutarChefeMundial('u2', 13, HOJE);
    // no mesmo dia, nada chega
    expect((await estadoDoCorreio('u1', HOJE)).mensagens).toEqual([]);
    const c1 = await estadoDoCorreio('u1', AMANHA);
    expect(c1.mensagens).toHaveLength(1);
    expect(c1.mensagens[0]).toMatchObject({ titulo: 'Chefe Mundial: 1º lugar', de: 'Chefe Mundial', presente: { ouro: 20000, diamantes: 100, essenciaDeSoberano: 100, selos: { origem: 10, eternidade: 20 } } });
    expect(c1.naoResgatadas).toBe(1);
    expect((await estadoDoCorreio('u1', AMANHA)).mensagens).toHaveLength(1);
    expect((await estadoDoCorreio('u2', AMANHA)).mensagens[0].titulo).toBe('Chefe Mundial: 2º lugar');
    const antes = (await getCharacterByUid('u1'))!;
    const r = await agirNoCorreio('u1', 'resgatar', { id: c1.mensagens[0].id }, AMANHA);
    expect(r.estado.naoResgatadas).toBe(0);
    const depois = (await getCharacterByUid('u1'))!;
    expect(depois.ouro).toBe(antes.ouro + 20000);
    expect(depois.essenciaDeSoberano).toBe(100);
    expect(depois.selosDeBusca).toEqual({ origem: 10, eternidade: 20 });
    expect(getTransactionsByUid('u1').some((t) => t.moeda === 'essenciaDeSoberano' && t.quantidade === 100)).toBe(true);
    expect((await erro(agirNoCorreio('u1', 'resgatar', { id: c1.mensagens[0].id }, AMANHA)))?.message).toMatch(/não está disponível/);
  });

  it('Mestre manda para um jogador e para todos; resgatar tudo; apagar só depois de resgatar; some em 30 dias', async () => {
    await enviarMensagemDoMestre(dono, { destino: 'u1', titulo: 'Compensação', texto: 'Pelo bug de ontem.', campos: { diamantes: 50, seloOrigem: 2 } }, undefined, HOJE);
    await enviarMensagemDoMestre(dono, { destino: 'todos', titulo: 'Evento', texto: 'Feliz evento!', campos: { avancosDeExpedicao: 3 } }, undefined, HOJE);
    await enviarMensagemDoMestre(dono, { destino: 'todos', titulo: 'Aviso', texto: 'Manutenção amanhã.' }, undefined, HOJE);
    const c = await estadoDoCorreio('u1', HOJE);
    expect(c.mensagens.map((m) => m.titulo).sort()).toEqual(['Aviso', 'Compensação', 'Evento']);
    expect(c.naoResgatadas).toBe(2);
    const id = (t: string) => c.mensagens.find((m) => m.titulo === t)!.id;
    expect((await erro(agirNoCorreio('u1', 'apagar', { id: id('Evento') }, HOJE)))?.message).toMatch(/Resgate o presente/);
    await agirNoCorreio('u1', 'apagar', { id: id('Aviso') }, HOJE);
    const tudo = await agirNoCorreio('u1', 'resgatarTudo', {}, HOJE);
    expect(tudo.mensagem).toBe('2 presentes resgatados!');
    const u1 = (await getCharacterByUid('u1'))!;
    expect([u1.diamantes, u1.avancosDeExpedicao, u1.selosDeBusca]).toEqual([50, 3, { origem: 2 }]);
    expect(tudo.estado.mensagens.map((m) => m.titulo).sort()).toEqual(['Compensação', 'Evento']);
    // o outro jogador ainda tem a mensagem para todos
    expect((await estadoDoCorreio('u2', HOJE)).naoResgatadas).toBe(1);
    // 31 dias depois, sumiu tudo
    limparCacheDoCorreio();
    expect((await estadoDoCorreio('u2', new Date(HOJE.getTime() + 31 * 86_400_000))).mensagens).toEqual([]);
    await expect(enviarMensagemDoMestre(dono, { destino: 'ninguem', titulo: 'Oi oi', texto: 'Teste.' })).rejects.toMatchObject({ status: 404 });
    await expect(enviarMensagemDoMestre(dono, { destino: 'u1', titulo: 'Oi oi', texto: 'Teste.', campos: { xp: 10 } })).rejects.toMatchObject({ status: 400 });
    await expect(enviarMensagemDoMestre({ ...dono, papel: 'mestre' }, { destino: 'u1', titulo: 'Oi oi', texto: 'Teste.' })).rejects.toMatchObject({ status: 403 });
  });

  it('rotas', async () => {
    expect((await correioGet(new NextRequest('http://t/api/correio'))).status).toBe(401);
    expect(await (await correioGet(req('/api/correio', 'u1'))).json()).toEqual({ mensagens: [], naoResgatadas: 0 });
    expect((await correioPost(req('/api/correio', 'u1', { acao: 'voar' }))).status).toBe(400);
    expect((await chefeGet(new NextRequest('http://t/api/chefe-mundial'))).status).toBe(401);
    const luta = await chefePost(req('/api/chefe-mundial', 'u1', {}));
    expect(luta.status).toBe(200);
    expect((await luta.json()).estado.minhaPosicao).toBe(1);
    expect((await mestreCorreioPost(req('/api/mestre/correio', 'u1', { destino: 'todos', titulo: 'Oi oi', texto: 'Teste.' }))).status).toBe(403);
    expect((await mestreCorreioPost(req('/api/mestre/correio', 'dono1', { destino: 'todos', titulo: 'Oi oi', texto: 'Teste.' }))).status).toBe(200);
  });
});
